import { inngest } from "./client";
import {
  sendWelcomeEmail,
  sendInviteEmail,
  sendReminderEmail,
  sendMeetingReminderEmail,
  sendMinutesEmail,
  sendActionItemEmail,
  sendActionItemCreatedEmail,
  sendActionItemStatusChangedEmail,
  sendPublicEventInviteEmail,
} from "@/lib/email";

/**
 * Email Queue Functions
 *
 * All email operations are processed asynchronously through Inngest.
 * This prevents user-facing requests from blocking on email delivery,
 * while maintaining reliable delivery with automatic retries.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Welcome Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailWelcome = inngest.createFunction(
  { id: "email.welcome", retries: 3 },
  { event: "email/welcome" },
  async ({ event }) => {
    const { to, toName, loginUrl, tempPassword } = event.data;

    console.log(`[inngest] Processing welcome email to ${to}`);

    const success = await sendWelcomeEmail({
      to,
      toName,
      loginUrl,
      tempPassword,
    });

    if (!success) {
      throw new Error(`Failed to send welcome email to ${to}`);
    }

    return { success: true, to };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Event Invitation Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailInvitation = inngest.createFunction(
  { id: "email.invitation", retries: 3 },
  { event: "email/invitation" },
  async ({ event }) => {
    const {
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
    } = event.data;

    console.log(`[inngest] Processing invitation email to ${to} for ${eventTitle}`);

    await sendInviteEmail({
      to,
      toName,
      eventTitle,
      eventDescription,
      eventType,
      classification,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      venueName,
      roomName,
      organizerName,
      organizerEmail,
      ministryName,
      recurrenceText,
      acceptUrl,
      declineUrl,
    });

    return { success: true, to, eventTitle };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Public Event Invitation Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailPublicInvitation = inngest.createFunction(
  { id: "email.public-invitation", retries: 3 },
  { event: "email/public-invitation" },
  async ({ event }) => {
    const {
      to,
      toName,
      eventTitle,
      eventDescription,
      startAt,
      endAt,
      venueName,
      organizerMinistryName,
      eventUrl,
    } = event.data;

    console.log(`[inngest] Processing public invitation email to ${to} for ${eventTitle}`);

    await sendPublicEventInviteEmail({
      to,
      toName,
      eventTitle,
      eventDescription,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      venueName,
      organizerMinistryName,
      eventUrl,
    });

    return { success: true, to, eventTitle };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Action Item Reminder Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailReminder = inngest.createFunction(
  { id: "email.reminder", retries: 3 },
  { event: "email/reminder" },
  async ({ event }) => {
    const {
      to,
      toName,
      title,
      eventTitle,
      dueDate,
      minutesUrl,
    } = event.data;

    console.log(`[inngest] Processing action item reminder email to ${to}`);

    await sendReminderEmail({
      to,
      toName,
      title,
      eventTitle,
      dueDate: new Date(dueDate),
      minutesUrl,
    });

    return { success: true, to, title };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Meeting Start Reminder Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailMeetingReminder = inngest.createFunction(
  { id: "email.meeting-reminder", retries: 3 },
  { event: "email/meeting-reminder" },
  async ({ event }) => {
    const {
      to,
      toName,
      eventTitle,
      eventDate,
      startAt,
      endAt,
      venueName,
      roomName,
      organizerName,
      ministryName,
      checkInUrl,
    } = event.data;

    console.log(`[inngest] Processing meeting reminder email to ${to} for ${eventTitle}`);

    await sendMeetingReminderEmail({
      to,
      toName,
      eventTitle,
      eventDate,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      venueName,
      roomName,
      organizerName,
      ministryName,
      checkInUrl,
    });

    return { success: true, to, eventTitle };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Minutes Published Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailMinutesPublished = inngest.createFunction(
  { id: "email.minutes", retries: 3 },
  { event: "email/minutes" },
  async ({ event }) => {
    const { to, toName, eventTitle, eventDate, summary, minutesUrl, actionItems } = event.data;

    console.log(`[inngest] Processing minutes email to ${to} for ${eventTitle}`);

    await sendMinutesEmail({
      to,
      toName,
      eventTitle,
      eventDate,
      summary,
      minutesUrl,
      actionItems: actionItems?.map(item => ({
        ...item,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      })),
    });

    return { success: true, to, eventTitle };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Action Item Assigned Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailActionItemAssigned = inngest.createFunction(
  { id: "email.action-item-assigned", retries: 3 },
  { event: "email/action-item-assigned" },
  async ({ event }) => {
    const { to, toName, title, eventTitle, dueDate, minutesUrl } = event.data;

    console.log(`[inngest] Processing action item assigned email to ${to}`);

    await sendActionItemEmail({
      to,
      toName,
      title,
      eventTitle,
      dueDate: dueDate ? new Date(dueDate) : null,
      minutesUrl,
    });

    return { success: true, to, title };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Action Item Created Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailActionItemCreated = inngest.createFunction(
  { id: "email.action-item-created", retries: 3 },
  { event: "email/action-item-created" },
  async ({ event }) => {
    const { to, toName, title, eventTitle, ownerName, dueDate, minutesUrl } = event.data;

    console.log(`[inngest] Processing action item created email to ${to}`);

    await sendActionItemCreatedEmail({
      to,
      toName,
      title,
      eventTitle,
      ownerName,
      dueDate: dueDate ? new Date(dueDate) : null,
      minutesUrl,
    });

    return { success: true, to, title };
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Action Item Status Changed Email
// ──────────────────────────────────────────────────────────────────────────────

export const emailActionItemStatusChanged = inngest.createFunction(
  { id: "email.action-item-status-changed", retries: 3 },
  { event: "email/action-item-status-changed" },
  async ({ event }) => {
    const { to, toName, title, eventTitle, oldStatus, newStatus, minutesUrl } = event.data;

    console.log(`[inngest] Processing action item status changed email to ${to}`);

    await sendActionItemStatusChangedEmail({
      to,
      toName,
      title,
      eventTitle,
      oldStatus,
      newStatus,
      minutesUrl,
    });

    return { success: true, to, title };
  }
);
