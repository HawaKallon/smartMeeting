import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMeetingReminderEmail } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/appUrl";

// Activity reminders — emailed to invitees who have not declined,
// roughly 1 hour before the activity starts.
//
// Schedule this endpoint to run frequently (every 10–15 minutes) from any cron
// service (Vercel Cron, cron-job.org, …) so the 1-hour window is caught near
// the right time, with header: Authorization: Bearer <CRON_SECRET>
//
// Idempotency: each event is marked (Event.reminderSentAt) once its reminders
// go out, so repeated runs within the window never re-notify.

const LEAD_MS = 60 * 60 * 1000; // send within the hour before start

async function handleReminderCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + LEAD_MS);

  // Upcoming events starting within the next hour that haven't been reminded yet.
  const events = await prisma.event.findMany({
    where: {
      startAt: { gte: now, lte: windowEnd },
      reminderSentAt: null,
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      venueName: true,
      room: { select: { name: true } },
      attendees: {
        where: { status: { in: ["INVITED", "CONFIRMED"] } },
        select: {
          externalName: true,
          externalEmail: true,
          user: {
            select: {
              name: true,
              email: true,
              emailNotifications: true,
              meetingReminders: true,
            },
          },
        },
      },
    },
  });

  let emailsSent = 0;
  let emailsFailed = 0;
  const succeededEventIds: string[] = [];

  for (const event of events) {
    // Build the recipient list from invitees who have not declined.
    // Registered users can have notifications turned off; external guests
    // (no account) always get the reminder and no in-app link.
    const recipients: { to: string; toName: string; joinUrl?: string }[] = [];
    for (const a of event.attendees) {
      if (a.user) {
        if (!a.user.email) continue;
        if (!a.user.emailNotifications || !a.user.meetingReminders) continue;
        recipients.push({
          to: a.user.email,
          toName: a.user.name ?? a.user.email,
          joinUrl: absoluteAppUrl(`/administrative/events/${event.id}`),
        });
      } else if (a.externalEmail) {
        recipients.push({
          to: a.externalEmail,
          toName: a.externalName ?? a.externalEmail,
        });
      }
    }

    const results = await Promise.all(
      recipients.map((r) =>
        sendMeetingReminderEmail({
          to: r.to,
          toName: r.toName,
          eventTitle: event.title,
          startAt: event.startAt,
          venueName: event.venueName,
          roomName: event.room?.name ?? null,
          joinUrl: r.joinUrl ?? null,
        }),
      ),
    );
    const sentForEvent = results.filter(Boolean).length;
    const failedForEvent = results.length - sentForEvent;
    emailsSent += sentForEvent;
    emailsFailed += failedForEvent;

    // Only finalize successful batches. A provider/configuration failure leaves
    // the event eligible for the next cron run instead of silently losing it.
    if (failedForEvent === 0) {
      succeededEventIds.push(event.id);
    }
  }

  // Batch update all successful events instead of N+1 sequential updates
  const eventsNotified = succeededEventIds.length;
  if (succeededEventIds.length > 0) {
    await prisma.event.updateMany({
      where: { id: { in: succeededEventIds } },
      data: { reminderSentAt: now },
    });
  }

  return NextResponse.json({
    ok: true,
    eventsChecked: events.length,
    eventsNotified,
    emailsSent,
    emailsFailed,
  });
}

// Vercel Cron invokes configured paths with GET. POST remains available for
// existing external cron services and manual authenticated invocations.
export const GET = handleReminderCron;
export const POST = handleReminderCron;
