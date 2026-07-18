import { inngest } from "@/inngest/client";

/**
 * Email Queue API
 *
 * All functions in this module queue emails for background processing.
 * Functions return immediately without waiting for delivery.
 *
 * Inngest handles:
 * - Automatic retries (3 times)
 * - Reliable delivery
 * - Dead-letter queue for failed emails
 * - Audit trail of all sends
 */

export async function queueWelcomeEmail({
  to,
  toName,
  loginUrl,
  tempPassword,
}: {
  to: string;
  toName: string;
  loginUrl: string;
  tempPassword: string;
}): Promise<void> {
  await inngest.send({
    name: "email/welcome",
    data: {
      to,
      toName,
      loginUrl,
      tempPassword,
    },
  });
}

export async function queueInvitationEmail({
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
}): Promise<void> {
  await inngest.send({
    name: "email/invitation",
    data: {
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
    },
  });
}

export async function queuePublicInvitationEmail({
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
}): Promise<void> {
  await inngest.send({
    name: "email/public-invitation",
    data: {
      to,
      toName,
      eventTitle,
      eventDescription,
      startAt,
      endAt,
      venueName,
      organizerMinistryName,
      eventUrl,
    },
  });
}

export async function queueReminderEmail({
  to,
  toName,
  title,
  eventTitle,
  dueDate,
  minutesUrl,
}: {
  to: string;
  toName: string;
  title: string;
  eventTitle: string;
  dueDate: Date;
  minutesUrl: string;
}): Promise<void> {
  await inngest.send({
    name: "email/reminder",
    data: {
      to,
      toName,
      title,
      eventTitle,
      dueDate,
      minutesUrl,
    },
  });
}

export async function queueMeetingReminderEmail({
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
}: {
  to: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  startAt: Date;
  endAt: Date;
  venueName?: string | null;
  roomName?: string | null;
  organizerName: string;
  ministryName: string;
  checkInUrl: string;
}): Promise<void> {
  await inngest.send({
    name: "email/meeting-reminder",
    data: {
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
    },
  });
}

export async function queueMinutesEmail({
  to,
  toName,
  eventTitle,
  eventDate,
  summary,
  minutesUrl,
  actionItems,
}: {
  to: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  summary: string | null;
  minutesUrl: string;
  actionItems?: Array<{
    title: string;
    ownerName?: string | null;
    dueDate?: Date | null;
  }>;
}): Promise<void> {
  await inngest.send({
    name: "email/minutes",
    data: {
      to,
      toName,
      eventTitle,
      eventDate,
      summary,
      minutesUrl,
      actionItems,
    },
  });
}

export async function queueActionItemAssignedEmail({
  to,
  toName,
  title,
  eventTitle,
  dueDate,
  minutesUrl,
}: {
  to: string;
  toName: string;
  title: string;
  eventTitle: string;
  dueDate: Date | null;
  minutesUrl: string | null;
}): Promise<void> {
  await inngest.send({
    name: "email/action-item-assigned",
    data: {
      to,
      toName,
      title,
      eventTitle,
      dueDate,
      minutesUrl,
    },
  });
}

export async function queueActionItemCreatedEmail({
  to,
  toName,
  title,
  eventTitle,
  ownerName,
  dueDate,
  minutesUrl,
}: {
  to: string;
  toName: string;
  title: string;
  eventTitle: string;
  ownerName: string | null;
  dueDate: Date | null;
  minutesUrl: string | null;
}): Promise<void> {
  await inngest.send({
    name: "email/action-item-created",
    data: {
      to,
      toName,
      title,
      eventTitle,
      ownerName,
      dueDate,
      minutesUrl,
    },
  });
}

export async function queueActionItemStatusChangedEmail({
  to,
  toName,
  title,
  eventTitle,
  oldStatus,
  newStatus,
  minutesUrl,
}: {
  to: string;
  toName: string;
  title: string;
  eventTitle: string;
  oldStatus: string;
  newStatus: string;
  minutesUrl: string | null;
}): Promise<void> {
  await inngest.send({
    name: "email/action-item-status-changed",
    data: {
      to,
      toName,
      title,
      eventTitle,
      oldStatus,
      newStatus,
      minutesUrl,
    },
  });
}
