import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { sendReminderSms } from "@/lib/sms";

// Scheduled reminders for action items due within the next 2 days.
// Call this endpoint from any cron service (Vercel Cron, cron-job.org, etc.)
// with the header: Authorization: Bearer <CRON_SECRET>
//
// Example cron-job.org setup: daily at 08:00, POST to /api/cron/reminders

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days ahead

  // Find all TODO/IN_PROGRESS items with a due date in the next 2 days.
  const items = await prisma.actionItem.findMany({
    where: {
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { gte: now, lte: cutoff },
      ownerId: { not: null },
    },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      minutes: {
        select: {
          eventId: true,
          event: { select: { title: true } },
        },
      },
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let sent = 0;

  await Promise.allSettled(
    items.map(async (item) => {
      if (!item.owner || !item.dueDate) return;

      const minutesUrl = `${baseUrl}/events/${item.minutes.eventId}/minutes`;
      const eventTitle = item.minutes.event.title;

      await Promise.allSettled([
        sendReminderEmail({
          to: item.owner.email,
          toName: item.owner.name ?? item.owner.email,
          title: item.title,
          eventTitle,
          dueDate: item.dueDate,
          minutesUrl,
        }),
        // Send SMS only if phone is configured
        item.owner.phone
          ? sendReminderSms({
              to: item.owner.phone,
              toName: item.owner.name ?? item.owner.email,
              title: item.title,
              dueDate: item.dueDate,
            })
          : Promise.resolve(),
      ]);
      sent++;
    }),
  );

  return NextResponse.json({ ok: true, itemsChecked: items.length, remindersSent: sent });
}
