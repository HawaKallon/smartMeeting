import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/appUrl";
import { notify } from "@/lib/notify";

// Scheduled reminders for action items due within the next 24 hours.
// Call this endpoint from any cron service (Vercel Cron, cron-job.org, etc.)
// with the header: Authorization: Bearer <CRON_SECRET>
//
// Run this endpoint frequently enough to catch the 24-hour window.

const LEAD_MS = 24 * 60 * 60 * 1000;

function normalizeAssignee(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function resolveExternalAssignee(
  ownerName: string | null,
  attendees: Array<{ id: string; externalName: string | null; externalEmail: string | null }>,
) {
  const normalizedOwner = normalizeAssignee(ownerName);
  if (!normalizedOwner) return null;

  const byEmail = attendees.find(
    (attendee) => normalizeAssignee(attendee.externalEmail) === normalizedOwner,
  );
  if (byEmail?.externalEmail) {
    return {
      name: byEmail.externalName ?? byEmail.externalEmail,
      email: byEmail.externalEmail,
    };
  }

  const byName = attendees.filter(
    (attendee) => normalizeAssignee(attendee.externalName) === normalizedOwner,
  );
  const external = byName[0];
  if (byName.length === 1 && external?.externalEmail) {
    return {
      name: external.externalName ?? external.externalEmail,
      email: external.externalEmail,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + LEAD_MS);

  // Find all open assigned items with a due date in the next 24 hours.
  const items = await prisma.actionItem.findMany({
    where: {
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { gte: now, lte: cutoff },
      reminderSentAt: null,
      OR: [
        { ownerId: { not: null } },
        { ownerName: { not: null } },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          ministryId: true,
          emailNotifications: true,
          actionItemNotifications: true,
        },
      },
      minutes: {
        select: {
          eventId: true,
          event: {
            select: {
              title: true,
              attendees: {
                where: { userId: null, externalEmail: { not: null } },
                select: { id: true, externalName: true, externalEmail: true },
              },
            },
          },
        },
      },
    },
  });

  let sent = 0;

  await Promise.allSettled(items.map(async (item) => {
    if (!item.dueDate) return;

    const minutesUrl = absoluteAppUrl(`/administrative/events/${item.minutes.eventId}/minutes`);
    const eventTitle = item.minutes.event.title;
    const body = `Action item: ${item.title}\nTimeline: ${item.dueDate.toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    if (item.owner) {
      const shouldNotify = item.owner.actionItemNotifications;
      const shouldEmail = item.owner.emailNotifications && item.owner.actionItemNotifications;
      const delivery = [
        shouldNotify
          ? notify({
              userId: item.owner.id,
              type: "ACTION_ITEM_DEADLINE_REMINDER",
              title: "Action item due in 24 hours",
              body,
              link: minutesUrl,
              ministryId: item.owner.ministryId,
            })
          : Promise.resolve(),
        shouldEmail
          ? sendReminderEmail({
              to: item.owner.email,
              toName: item.owner.name ?? item.owner.email,
              title: item.title,
              eventTitle,
              dueDate: item.dueDate,
              minutesUrl,
            })
          : Promise.resolve(),
      ];

      await Promise.allSettled(delivery);
      if (shouldNotify || shouldEmail) sent++;
    } else {
      const external = resolveExternalAssignee(item.ownerName, item.minutes.event.attendees);
      if (!external) return;

      await sendReminderEmail({
        to: external.email,
        toName: external.name,
        title: item.title,
        eventTitle,
        dueDate: item.dueDate,
        minutesUrl,
      });
      sent++;
    }

    await prisma.actionItem.update({
      where: { id: item.id },
      data: { reminderSentAt: now },
    });
  }));

  return NextResponse.json({ ok: true, itemsChecked: items.length, remindersSent: sent });
}
