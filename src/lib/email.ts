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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailText(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function emailShell({
  eyebrow,
  title,
  ministryName,
  intro,
  body,
  footer,
}: {
  eyebrow: string;
  title: string;
  ministryName: string;
  intro: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f4f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #d8e1ee;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#003580 0%,#0a4ca3 70%,#007236 100%);padding:28px 32px;color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d8e6fb;">Government of Sierra Leone</div>
                    <div style="margin-top:7px;font-size:22px;font-weight:700;line-height:1.3;">${ministryName}</div>
                  </td>
                  <td align="right" style="width:140px;">
                    <div style="display:inline-block;border:1px dashed rgba(255,255,255,0.35);border-radius:16px;padding:14px 12px;text-align:center;min-width:108px;">
                      <div style="width:56px;height:56px;line-height:56px;margin:0 auto;border-radius:999px;border:3px solid #fab700;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Coat</div>
                      <div style="margin-top:10px;font-size:10px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:#e9f3ff;">Placeholder</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#007236;">${eyebrow}</div>
              <h1 style="margin:10px 0 14px;font-size:28px;line-height:1.25;color:#003580;">${title}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#334155;">${intro}</p>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5edf7;background:#f9fbfe;padding:18px 32px;font-size:11px;line-height:1.6;color:#64748b;">${footer}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function emailDetailRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:9px 16px 9px 0;color:#64748b;font-size:13px;font-weight:700;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:9px 0;color:#172033;font-size:14px;line-height:1.55;vertical-align:top;">${value}</td>
    </tr>`;
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
      html: emailShell({
        eyebrow: "Administrative access",
        title: "Welcome to Smart Meeting",
        ministryName: "Smart Meeting Administration",
        intro: `Hello ${escapeHtml(toName)}, your account has been created and is ready for first-time access. Sign in with the temporary credentials below, then change your password from your profile after login.`,
        body: `
          <div style="border:1px solid #d8e1ee;border-radius:14px;background:#f9fbfe;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:13px;font-weight:700;color:#003580;margin-bottom:10px;">Access details</div>
            <div style="font-size:14px;line-height:1.8;color:#334155;"><strong>Email:</strong> ${escapeHtml(to)}<br><strong>Temporary password:</strong> <code style="font-size:15px;background:#ffffff;border:1px solid #d8e1ee;border-radius:8px;padding:2px 8px;">${escapeHtml(tempPassword)}</code></div>
          </div>
          <p style="margin:0 0 22px;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#003580;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:12px;">Log In to Smart Meeting</a></p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">For security, please change this temporary password after your first login.</p>
        `,
        footer: "This is an administrative access message issued through the Smart Meeting &amp; Attendance Logger.",
      }),
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
  to,
  toName,
  eventTitle,
  eventDescription,
  eventType,
  classification,
  startAt,
  endAt,
  venueName,
  roomName,
  organizerName,
  organizerEmail,
  ministryName,
  recurrenceText,
  acceptUrl,
  declineUrl,
}: {
  to: string;
  toName: string;
  eventTitle: string;
  eventDescription?: string | null;
  eventType?: string | null;
  classification?: string | null;
  startAt: Date;
  endAt: Date;
  venueName?: string | null;
  roomName?: string | null;
  organizerName: string;
  organizerEmail: string;
  ministryName: string;
  recurrenceText?: string | null;
  acceptUrl: string;
  declineUrl: string;
}) {
  if (!resend) {
    return skip(to, `RESEND_API_KEY not set. Configure it in .env`);
  }

  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured. Set EMAIL_FROM in .env to your verified Resend domain`);
  }

  const date = startAt.toLocaleDateString("en-GB", {
    timeZone: "Africa/Freetown",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const startTime = startAt.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Freetown",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endAt.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Freetown",
    hour: "2-digit",
    minute: "2-digit",
  });

  const location = roomName || venueName;
  const subject = `Official Meeting Invitation — ${eventTitle}`;
  const safe = {
    toName: escapeHtml(toName),
    eventTitle: escapeHtml(eventTitle),
    description: eventDescription ? emailText(eventDescription) : null,
    eventType: eventType ? escapeHtml(eventType.replaceAll("_", " ").toLowerCase()) : null,
    classification: classification ? escapeHtml(classification.toLowerCase()) : null,
    date: escapeHtml(date),
    time: escapeHtml(`${startTime}–${endTime} GMT`),
    location: location ? escapeHtml(location) : "To be confirmed",
    organizerName: escapeHtml(organizerName),
    ministryName: escapeHtml(ministryName),
    recurrence: recurrenceText ? escapeHtml(recurrenceText) : null,
    acceptUrl: escapeHtml(acceptUrl),
    declineUrl: escapeHtml(declineUrl),
  };

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 16px 8px 0;color:#64748b;font-size:13px;font-weight:600;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:8px 0;color:#172033;font-size:14px;line-height:1.5;vertical-align:top;">${value}</td>
    </tr>`;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      replyTo: organizerEmail,
      subject,
      text: [
        `Dear ${toName},`,
        ``,
        `${organizerName}, on behalf of ${ministryName}, formally invites you to attend the following meeting.`,
        ``,
        `MEETING DETAILS`,
        `Title: ${eventTitle}`,
        eventType ? `Type: ${eventType.replaceAll("_", " ").toLowerCase()}` : null,
        classification ? `Classification: ${classification.toLowerCase()}` : null,
        `Date: ${date}`,
        `Time: ${startTime}–${endTime} GMT`,
        `Location: ${location ?? "To be confirmed"}`,
        recurrenceText ? `Schedule: ${recurrenceText}` : null,
        eventDescription ? `Purpose / agenda:\n${eventDescription}` : null,
        ``,
        `Please respond using one of the secure links below:`,
        `Accept: ${acceptUrl}`,
        `Decline: ${declineUrl}`,
        ``,
        `These links are personal to this invitation. Please do not forward them.`,
        ``,
        `Yours faithfully,`,
        organizerName,
        `On behalf of ${ministryName}`,
        `Government of Sierra Leone`,
      ].filter(Boolean).join("\n"),
      html: emailShell({
        eyebrow: "Official meeting invitation",
        title: safe.eventTitle,
        ministryName: safe.ministryName,
        intro: `Dear ${safe.toName}, ${safe.organizerName}, on behalf of ${safe.ministryName}, formally invites you to attend the meeting detailed below.`,
        body: `
          <div style="border:1px solid #d8e1ee;border-radius:14px;background:#f9fbfe;padding:16px 20px;margin-bottom:24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${safe.eventType ? detailRow("Type", safe.eventType) : ""}
              ${safe.classification ? detailRow("Classification", safe.classification) : ""}
              ${detailRow("Date", safe.date)}
              ${detailRow("Time", safe.time)}
              ${detailRow("Location", safe.location)}
              ${safe.recurrence ? detailRow("Schedule", safe.recurrence) : ""}
              ${detailRow("Organizer", safe.organizerName)}
            </table>
          </div>

          ${safe.description ? `<div style="margin-bottom:24px;"><div style="margin-bottom:7px;font-size:13px;font-weight:700;color:#003580;text-transform:uppercase;letter-spacing:.6px;">Purpose / Agenda</div><div style="font-size:14px;line-height:1.7;color:#334155;">${safe.description}</div></div>` : ""}

          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">Kindly confirm whether you will attend:</p>
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="padding:0 10px 10px 0;"><a href="${safe.acceptUrl}" style="display:inline-block;background:#007236;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:12px;">Accept Invitation</a></td>
            <td style="padding:0 0 10px;"><a href="${safe.declineUrl}" style="display:inline-block;background:#ffffff;color:#8b1e1e;text-decoration:none;font-size:14px;font-weight:700;padding:12px 21px;border:1px solid #f2c9c9;border-radius:12px;">Decline</a></td>
          </tr></table>

          <p style="margin:15px 0 24px;font-size:12px;line-height:1.6;color:#64748b;">For security, these response links are personal to your invitation. Please do not forward this email.</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">Yours faithfully,<br><strong>${safe.organizerName}</strong><br>On behalf of ${safe.ministryName}</p>
        `,
        footer: "This is an official internal meeting notification issued through the Smart Meeting &amp; Attendance Logger. Replies are directed to the meeting organizer.",
      }),
    });
    console.log(`[email] sent invite to ${to}:`, result.data?.id);
  } catch (err) {
    logError(to, subject, err);
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
  eventTitle: string; dueDate: Date | null; minutesUrl: string | null;
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
        minutesUrl
          ? `View details: ${minutesUrl}`
          : `Please contact the meeting organizer if you need the full meeting minutes.`,
      ].join("\n"),
    });
    console.log(`[email] sent action item to ${to}:`, result.data?.id);
  } catch (err) {
    logError(to, `Action Item Assigned: ${title}`, err);
  }
}

// ── Action Item Created ───────────────────────────────────────────────────────

export async function sendActionItemCreatedEmail({
  to, toName, title, eventTitle, ownerName, dueDate, minutesUrl,
}: {
  to: string; toName: string; title: string;
  eventTitle: string; ownerName: string | null; dueDate: Date | null; minutesUrl: string | null;
}) {
  if (!resend) return skip(to, `RESEND_API_KEY not set`);
  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured in .env`);
  }

  const due = dueDate
    ? dueDate.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "No deadline set";
  const safe = {
    toName: escapeHtml(toName),
    title: escapeHtml(title),
    eventTitle: escapeHtml(eventTitle),
    ownerName: escapeHtml(ownerName || "Not assigned"),
    due: escapeHtml(due),
    minutesUrl: minutesUrl ? escapeHtml(minutesUrl) : null,
  };

  try {
    const result = await resend.emails.send({
      from: FROM, to,
      subject: `New Action Item: ${title}`,
      text: [
        `Dear ${toName},`,
        ``,
        `A new action item was created for "${eventTitle}":`,
        ``,
        `  Task        : ${title}`,
        `  Responsible : ${ownerName || "Not assigned"}`,
        `  Due         : ${due}`,
        ``,
        minutesUrl
          ? `View details: ${minutesUrl}`
          : `Please contact the meeting organizer if you need the full meeting minutes.`,
      ].join("\n"),
      html: emailShell({
        eyebrow: "Action item notice",
        title: "New Action Item Created",
        ministryName: safe.eventTitle,
        intro: `Dear ${safe.toName}, a new action item has been recorded from the meeting <strong>${safe.eventTitle}</strong>. This notice is shared with all meeting invitees for accountability and follow-up.`,
        body: `
          <div style="border:1px solid #d8e1ee;border-radius:14px;background:#f9fbfe;padding:16px 20px;margin-bottom:24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${emailDetailRow("Meeting", safe.eventTitle)}
              ${emailDetailRow("Action item", safe.title)}
              ${emailDetailRow("Responsible party", safe.ownerName)}
              ${emailDetailRow("Timeline", safe.due)}
            </table>
          </div>
          ${safe.minutesUrl
            ? `<p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#334155;">Please review the meeting minutes for the full context and any related decisions.</p><p style="margin:0 0 22px;"><a href="${safe.minutesUrl}" style="display:inline-block;background:#003580;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:12px;">View Meeting Minutes</a></p>`
            : `<p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#334155;">If you need the official meeting minutes, please contact the meeting organizer or responsible ministry representative.</p>`}
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">This notification was sent to all invitees for this meeting, including pending and declined invitees.</p>
        `,
        footer: `This is an official action item notification for ${safe.eventTitle}.`,
      }),
    });
    console.log(`[email] sent action item created notice to ${to}:`, result.data?.id);
  } catch (err) {
    logError(to, `New Action Item: ${title}`, err);
  }
}

// ── Action Item Status Changed ────────────────────────────────────────────────

export async function sendActionItemStatusChangedEmail({
  to, toName, title, eventTitle, oldStatus, newStatus, minutesUrl,
}: {
  to: string; toName: string; title: string;
  eventTitle: string; oldStatus: string; newStatus: string; minutesUrl: string | null;
}) {
  if (!resend) return skip(to, `RESEND_API_KEY not set`);
  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured in .env`);
  }
  const safe = {
    toName: escapeHtml(toName),
    title: escapeHtml(title),
    eventTitle: escapeHtml(eventTitle),
    oldStatus: escapeHtml(oldStatus),
    newStatus: escapeHtml(newStatus),
    minutesUrl: minutesUrl ? escapeHtml(minutesUrl) : null,
  };

  try {
    const result = await resend.emails.send({
      from: FROM, to,
      subject: `Action Item Status Updated: ${title}`,
      text: [
        `Dear ${toName},`,
        ``,
        `An action item status changed for "${eventTitle}":`,
        ``,
        `  Task        : ${title}`,
        `  Previous    : ${oldStatus}`,
        `  Current     : ${newStatus}`,
        ``,
        minutesUrl
          ? `View details: ${minutesUrl}`
          : `Please contact the meeting organizer if you need the full meeting minutes.`,
      ].join("\n"),
      html: emailShell({
        eyebrow: "Action item update",
        title: "Action Item Status Updated",
        ministryName: safe.eventTitle,
        intro: `Dear ${safe.toName}, the status of an action item from <strong>${safe.eventTitle}</strong> has been updated. This notice is shared with all meeting invitees so everyone has the latest task position.`,
        body: `
          <div style="border:1px solid #d8e1ee;border-radius:14px;background:#f9fbfe;padding:16px 20px;margin-bottom:24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${emailDetailRow("Meeting", safe.eventTitle)}
              ${emailDetailRow("Action item", safe.title)}
              ${emailDetailRow("Previous status", safe.oldStatus)}
              ${emailDetailRow("Current status", `<span style="display:inline-block;background:#e8f4ed;color:#007236;border:1px solid #b9dec9;border-radius:999px;padding:4px 10px;font-weight:700;">${safe.newStatus}</span>`)}
            </table>
          </div>
          ${safe.minutesUrl
            ? `<p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#334155;">Please refer to the meeting minutes for the full action log and supporting context.</p><p style="margin:0 0 22px;"><a href="${safe.minutesUrl}" style="display:inline-block;background:#003580;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:12px;">View Meeting Minutes</a></p>`
            : `<p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#334155;">If you need the official meeting minutes, please contact the meeting organizer or responsible ministry representative.</p>`}
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">This notification was sent to all invitees for this meeting, including pending and declined invitees.</p>
        `,
        footer: `This is an official action item update for ${safe.eventTitle}.`,
      }),
    });
    console.log(`[email] sent action item status notice to ${to}:`, result.data?.id);
  } catch (err) {
    logError(to, `Action Item Status Updated: ${title}`, err);
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

  const due = dueDate.toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
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

// ── Meeting Reminder (≈1 hour before start) ───────────────────────────────────

export async function sendMeetingReminderEmail({
  to, toName, eventTitle, startAt, venueName, roomName, joinUrl,
}: {
  to: string; toName: string; eventTitle: string; startAt: Date;
  venueName?: string | null; roomName?: string | null; joinUrl?: string | null;
}) {
  if (!resend) return skip(to, `RESEND_API_KEY not set`);
  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured. Set EMAIL_FROM in .env to your verified Resend domain`);
  }

  const time = startAt.toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const location = roomName || venueName;

  const lines = [
    `Dear ${toName},`,
    ``,
    `This is a reminder that a meeting you confirmed starts in about an hour:`,
    ``,
    `  Meeting : ${eventTitle}`,
    `  Starts  : ${time}`,
  ];
  if (location) lines.push(`  Location: ${location}`);
  if (joinUrl) lines.push(``, `Details: ${joinUrl}`);

  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Reminder: ${eventTitle} starts in 1 hour`,
      text: lines.join("\n"),
    });
  } catch (err) {
    logError(to, `Reminder: ${eventTitle} starts in 1 hour`, err);
  }
}

export async function sendPublicEventInviteEmail({
  to,
  toName,
  eventTitle,
  eventDescription,
  startAt,
  endAt,
  venueName,
  organizerMinistryName,
  eventUrl,
}: {
  to: string;
  toName: string;
  eventTitle: string;
  eventDescription?: string | null;
  startAt: Date;
  endAt: Date;
  venueName?: string | null;
  organizerMinistryName: string;
  eventUrl: string;
}) {
  if (!resend) return skip(to, `RESEND_API_KEY not set`);
  if (!FROM || FROM === "noreply@resend.dev") {
    return skip(to, `EMAIL_FROM not properly configured. Set EMAIL_FROM in .env to your verified Resend domain`);
  }

  const date = startAt.toLocaleDateString("en-GB", {
    timeZone: "Africa/Freetown",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const startTime = startAt.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Freetown",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endAt.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Freetown",
    hour: "2-digit",
    minute: "2-digit",
  });
  const location = venueName || "To be confirmed";

  const lines = [
    `Dear ${toName},`,
    ``,
    `Your ministry has been invited to attend the following public event:`,
    ``,
    `  Event   : ${eventTitle}`,
    `  Organizer : ${organizerMinistryName}`,
    `  Date    : ${date}`,
    `  Time    : ${startTime}–${endTime} GMT`,
    `  Venue   : ${location}`,
  ];
  if (eventDescription) lines.push(``, `Description:`, eventDescription);
  lines.push(``, `Details: ${eventUrl}`);

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You're invited: ${eventTitle}`,
      text: lines.join("\n"),
    });
  } catch (err) {
    logError(to, `You're invited: ${eventTitle}`, err);
  }
}
