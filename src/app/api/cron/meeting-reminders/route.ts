import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMeetingReminderEmail } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/appUrl";

// Meeting reminders — emailed to invitees who CONFIRMED their attendance,
// roughly 1 hour before the meeting starts.
//
// Schedule this endpoint to run frequently (every 10–15 minutes) from any cron
// service (Vercel Cron, cron-job.org, …) so the 1-hour window is caught near
// the right time, with header: Authorization: Bearer <CRON_SECRET>
//
// Idempotency: each event is marked (Event.reminderSentAt) once its reminders
// go out, so repeated runs within the window never re-notify.

const LEAD_MS = 60 * 60 * 1000; // send within the hour before start

export async function POST(req: NextRequest) {
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
        where: { status: "CONFIRMED" },
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

  for (const event of events) {
    // Build the recipient list from confirmed invitees with an email address.
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

    await Promise.allSettled(
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
    emailsSent += recipients.length;

    // Mark sent so later runs in the same window don't re-notify.
    await prisma.event.update({
      where: { id: event.id },
      data: { reminderSentAt: now },
    });
  }

  return NextResponse.json({
    ok: true,
    eventsNotified: events.length,
    emailsSent,
  });
}
