import { Resend } from "resend";

// Gracefully degrades when RESEND_API_KEY is not set.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "noreply@resend.dev";

function skip(to: string, reason = "RESEND_API_KEY not set") {
  console.warn(`[email] skipping to ${to} — ${reason}`);
}

function logError(to: string, subject: string, err: unknown) {
  console.error(`[email] failed to send "${subject}" to ${to}:`, err);

  // Log more details for debugging
  if (err instanceof Error) {
    console.error(`[email] error details:`, {
      message: err.message,
      stack: err.stack,
    });
  }
}

// ── Welcome / New User Invitation ─────────────────────────────────────────────

export async function sendWelcomeEmail({
  to, toName, loginUrl, tempPassword,
}: {
  to: string; toName: string; loginUrl: string; tempPassword: string;
}): Promise<boolean> {
  if (!resend) {
    skip(to, `RESEND_API_KEY not set`);
    return false;
  }
  if (!FROM || FROM === "noreply@resend.dev") {
    skip(to, `EMAIL_FROM not properly configured in .env`);
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM, to,
      subject: "Welcome to Smart Meeting",
      html: `
        <h2>Welcome to Smart Meeting</h2>
        <p>Hello ${toName},</p>
        <p>Your account has been created and is ready to use. Sign in with the temporary credentials below, then change your password from your profile.</p>
        <p style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
          <strong>Email:</strong> ${to}<br>
          <strong>Temporary password:</strong> <code style="font-size:15px;">${tempPassword}</code>
        </p>
        <p><a href="${loginUrl}" style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Log In to Smart Meeting</a></p>
        <p>For your security, please change this temporary password after your first login.</p>
        <p>Best regards,<br>Smart Meeting Team</p>
      `,
    });
    console.log(`[email] sent welcome to ${to}:`, result.data?.id);
    return true;
  } catch (err) {
    logError(to, "Welcome to Smart Meeting", err);
    return false;
  }
}

// ── Attendee Invitation ───────────────────────────────────────────────────────

export async function sendInviteEmail({
  to, toName, eventTitle, startAt, venueName, roomName, organizerName,
}: {
  to: string; toName: string; eventTitle: string;
  startAt: Date; venueName?: string | null; roomName?: string | null; organizerName: string;
}) {
  if (!resend) {
    return skip(to, `RESEND_API_KEY not set. Configure it in .env`);
  }

  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured. Set EMAIL_FROM in .env to your verified Resend domain`);
  }

  const date = startAt.toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const location = roomName || venueName;

  try {
    const result = await resend.emails.send({
      from: FROM, to,
      subject: `Invitation: ${eventTitle}`,
      text: [
        `Dear ${toName},`,
        ``,
        `You have been invited to: ${eventTitle}`,
        `Date  : ${date}`,
        location ? `Location : ${location}` : null,
        `By    : ${organizerName}`,
        ``,
        `Please log in to confirm or decline your attendance.`,
      ].filter(Boolean).join("\n"),
    });
    console.log(`[email] sent invite to ${to}:`, result.data?.id);
  } catch (err) {
    logError(to, `Invitation: ${eventTitle}`, err);
  }
}

// ── Minutes Published ─────────────────────────────────────────────────────────

export async function sendMinutesEmail({
  to, toName, eventTitle, eventDate, summary, minutesUrl,
}: {
  to: string; toName: string; eventTitle: string;
  eventDate: string; summary: string | null; minutesUrl: string;
}) {
  if (!resend) return skip(to, `RESEND_API_KEY not set`);
  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured in .env`);
  }

  try {
    const result = await resend.emails.send({
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
    console.log(`[email] sent minutes to ${to}:`, result.data?.id);
  } catch (err) {
    logError(to, `Minutes Published: ${eventTitle}`, err);
  }
}

// ── Action Item Assigned ──────────────────────────────────────────────────────

export async function sendActionItemEmail({
  to, toName, title, eventTitle, dueDate, minutesUrl,
}: {
  to: string; toName: string; title: string;
  eventTitle: string; dueDate: Date | null; minutesUrl: string;
}) {
  if (!resend) return skip(to, `RESEND_API_KEY not set`);
  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured in .env`);
  }

  const due = dueDate
    ? dueDate.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "No deadline set";

  try {
    const result = await resend.emails.send({
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
    console.log(`[email] sent action item to ${to}:`, result.data?.id);
  } catch (err) {
    logError(to, `Action Item Assigned: ${title}`, err);
  }
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

  try {
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
  } catch (err) {
    logError(to, `Reminder — Action item due soon: ${title}`, err);
  }
}
