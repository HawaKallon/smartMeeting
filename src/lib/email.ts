import { Resend } from "resend";

// Gracefully degrades when RESEND_API_KEY is not set.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = "Smart Meeting <noreply@smartmeeting.gov>";

function skip(to: string, reason = "RESEND_API_KEY not set") {
  console.warn(`[email] skipping to ${to} — ${reason}`);
}

// ── Attendee Invitation ───────────────────────────────────────────────────────

export async function sendInviteEmail({
  to, toName, eventTitle, startAt, venueName, organizerName,
}: {
  to: string; toName: string; eventTitle: string;
  startAt: Date; venueName: string | null; organizerName: string;
}) {
  if (!resend) return skip(to);

  const date = startAt.toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM, to,
    subject: `Invitation: ${eventTitle}`,
    text: [
      `Dear ${toName},`,
      ``,
      `You have been invited to: ${eventTitle}`,
      `Date  : ${date}`,
      venueName ? `Venue : ${venueName}` : null,
      `By    : ${organizerName}`,
      ``,
      `Please log in to confirm or decline your attendance.`,
    ].filter(Boolean).join("\n"),
  });
}

// ── Minutes Published ─────────────────────────────────────────────────────────

export async function sendMinutesEmail({
  to, toName, eventTitle, eventDate, summary, minutesUrl,
}: {
  to: string; toName: string; eventTitle: string;
  eventDate: string; summary: string | null; minutesUrl: string;
}) {
  if (!resend) return skip(to);

  await resend.emails.send({
    from: FROM, to,
    subject: `Minutes Published: ${eventTitle}`,
    text: [
      `Dear ${toName},`,
      ``,
      `The official minutes for "${eventTitle}" (${eventDate}) have been published.`,
      summary ? `\nSummary:\n${summary}` : null,
      ``,
      `View minutes: ${minutesUrl}`,
    ].filter(Boolean).join("\n"),
  });
}

// ── Action Item Assigned ──────────────────────────────────────────────────────

export async function sendActionItemEmail({
  to, toName, title, eventTitle, dueDate, minutesUrl,
}: {
  to: string; toName: string; title: string;
  eventTitle: string; dueDate: Date | null; minutesUrl: string;
}) {
  if (!resend) return skip(to);

  const due = dueDate
    ? dueDate.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "No deadline set";

  await resend.emails.send({
    from: FROM, to,
    subject: `Action Item Assigned: ${title}`,
    text: [
      `Dear ${toName},`,
      ``,
      `You have been assigned an action item from "${eventTitle}":`,
      ``,
      `  Task : ${title}`,
      `  Due  : ${due}`,
      ``,
      `View details: ${minutesUrl}`,
    ].join("\n"),
  });
}

// ── Action Item Due Reminder ──────────────────────────────────────────────────

export async function sendReminderEmail({
  to, toName, title, eventTitle, dueDate, minutesUrl,
}: {
  to: string; toName: string; title: string;
  eventTitle: string; dueDate: Date; minutesUrl: string;
}) {
  if (!resend) return skip(to);

  const due = dueDate.toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  await resend.emails.send({
    from: FROM, to,
    subject: `Reminder — Action item due soon: ${title}`,
    text: [
      `Dear ${toName},`,
      ``,
      `This is a reminder that the following action item is due soon:`,
      ``,
      `  Task  : ${title}`,
      `  Due   : ${due}`,
      `  Event : ${eventTitle}`,
      ``,
      `View and update: ${minutesUrl}`,
    ].join("\n"),
  });
}
