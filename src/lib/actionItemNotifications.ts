import { absoluteAppUrl } from "@/lib/appUrl";
import {
  sendActionItemCreatedEmail,
  sendActionItemStatusChangedEmail,
} from "@/lib/email";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

type ActionItemStatus = "TODO" | "IN_PROGRESS" | "DONE";

const STATUS_LABELS: Record<ActionItemStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

type Exclusions = {
  userIds?: string[];
  emails?: string[];
};

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function excludedEmail(email: string, exclusions?: Exclusions) {
  const normalized = normalizeEmail(email);
  return exclusions?.emails?.some((excluded) => normalizeEmail(excluded) === normalized) ?? false;
}

async function getMeetingInvitees(eventId: string, exclusions?: Exclusions) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      ministryId: true,
      attendees: {
        include: {
          user: { select: { id: true, name: true, email: true, ministryId: true } },
        },
      },
    },
  });
  if (!event) return null;

  const seenUsers = new Set<string>();
  const seenEmails = new Set<string>();
  const recipients: Array<{
    userId: string | null;
    ministryId: string | null;
    name: string;
    email: string | null;
  }> = [];

  for (const attendee of event.attendees) {
    if (!attendee.user) continue;
    if (exclusions?.userIds?.includes(attendee.user.id)) continue;
    if (seenUsers.has(attendee.user.id)) continue;
    seenUsers.add(attendee.user.id);

    const email = attendee.user.email;
    if (email) seenEmails.add(normalizeEmail(email));
    recipients.push({
      userId: attendee.user.id,
      ministryId: attendee.user.ministryId,
      name: attendee.user.name ?? attendee.user.email,
      email,
    });
  }

  for (const attendee of event.attendees) {
    if (attendee.user) {
      continue;
    }
    if (!attendee.externalEmail) continue;
    if (excludedEmail(attendee.externalEmail, exclusions)) continue;

    const normalized = normalizeEmail(attendee.externalEmail);
    if (seenEmails.has(normalized)) continue;
    seenEmails.add(normalized);
    recipients.push({
      userId: null,
      ministryId: event.ministryId,
      name: attendee.externalName ?? attendee.externalEmail,
      email: attendee.externalEmail,
    });
  }

  return { event, recipients };
}

export async function notifyMeetingInviteesActionItemCreated({
  eventId,
  title,
  ownerName,
  dueDate,
  exclusions,
}: {
  eventId: string;
  title: string;
  ownerName: string | null;
  dueDate: Date | null;
  exclusions?: Exclusions;
}) {
  const data = await getMeetingInvitees(eventId, exclusions);
  if (!data) return;

  const minutesUrl = absoluteAppUrl(`/administrative/events/${eventId}/minutes`);
  const dueDateStr = dueDate ? dueDate.toLocaleDateString("en-GB") : "No deadline set";
  const body = `Task: ${title}\nResponsible: ${ownerName || "Not assigned"}\nTimeline: ${dueDateStr}`;

  await Promise.allSettled(
    data.recipients.map((recipient) =>
      Promise.allSettled([
        recipient.userId
          ? notify({
              userId: recipient.userId,
              type: "ACTION_ITEM_CREATED",
              title: "New action item created",
              body,
              link: minutesUrl,
              ministryId: recipient.ministryId,
            })
          : Promise.resolve(),
        recipient.email
          ? sendActionItemCreatedEmail({
              to: recipient.email,
              toName: recipient.name,
              title,
              eventTitle: data.event.title,
              ownerName,
              dueDate,
              minutesUrl: recipient.userId ? minutesUrl : null,
            })
          : Promise.resolve(),
      ]),
    ),
  );
}

export async function notifyMeetingInviteesActionItemStatusChanged({
  eventId,
  title,
  oldStatus,
  newStatus,
}: {
  eventId: string;
  title: string;
  oldStatus: ActionItemStatus;
  newStatus: ActionItemStatus;
}) {
  if (oldStatus === newStatus) return;

  const data = await getMeetingInvitees(eventId);
  if (!data) return;

  const minutesUrl = absoluteAppUrl(`/administrative/events/${eventId}/minutes`);
  const oldLabel = STATUS_LABELS[oldStatus];
  const newLabel = STATUS_LABELS[newStatus];
  const body = `Task: ${title}\nStatus: ${oldLabel} -> ${newLabel}`;

  await Promise.allSettled(
    data.recipients.map((recipient) =>
      Promise.allSettled([
        recipient.userId
          ? notify({
              userId: recipient.userId,
              type: "ACTION_ITEM_STATUS_CHANGED",
              title: "Action item status changed",
              body,
              link: minutesUrl,
              ministryId: recipient.ministryId,
            })
          : Promise.resolve(),
        recipient.email
          ? sendActionItemStatusChangedEmail({
              to: recipient.email,
              toName: recipient.name,
              title,
              eventTitle: data.event.title,
              oldStatus: oldLabel,
              newStatus: newLabel,
              minutesUrl: recipient.userId ? minutesUrl : null,
            })
          : Promise.resolve(),
      ]),
    ),
  );
}
