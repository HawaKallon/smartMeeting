"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertRole, requireUser, assertSameMinistry } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { sendMinutesEmail, sendMinutesSubmittedEmail, sendActionItemEmail } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/appUrl";
import { sendMinutesSms } from "@/lib/sms";
import { summarizeMeeting } from "@/lib/llm";
import { canManageExistingEvent } from "@/lib/eventAccess";
import { notify } from "@/lib/notify";
import {
  notifyMeetingInviteesActionItemCreated,
  notifyMeetingInviteesActionItemStatusChanged,
} from "@/lib/actionItemNotifications";

export type ActionState = { error?: string; ok?: true } | undefined;

function parseFutureTimeline(
  value: string | undefined,
  timezoneOffset: string | undefined,
): { date: Date | null } | { error: string } {
  if (!value) return { date: null };

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  const offset = Number(timezoneOffset);
  const date = match && Number.isFinite(offset)
    ? new Date(
        Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
        ) + offset * 60_000,
      )
    : new Date(value);

  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    return { error: "Timeline must be in the future." };
  }

  return { date };
}

// ── Generate Minutes Summary (AI) ────────────────────────────────────────────

const GenerateSummarySchema = z.object({
  eventId: z.string().min(1),
});

export type GenerateSummaryState =
  | { ok: true; summary: string }
  | { error: string }
  | undefined;

export async function generateMinutesSummary(
  _prev: GenerateSummaryState,
  formData: FormData,
): Promise<GenerateSummaryState> {
  const user = await requireUser();

  const parsed = GenerateSummarySchema.safeParse({
    eventId: formData.get("eventId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId } = parsed.data;

  // Verify event belongs to user's ministry
  const event = await prisma.event.findFirst({
    where: { id: eventId },
    select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return { error: "Event not found or you don't have access." };

  const existing = await prisma.minutes.findFirst({
    where: { eventId },
  });
  if (existing?.status !== "DRAFT") return { error: "Minutes are locked for review or already published." };

  // Pull the meeting notes (body) from the minutes record.
  const minutes = await prisma.minutes.findFirst({
    where: { eventId },
    select: { body: true },
  });
  if (!minutes) return { error: "No meeting notes found to summarize." };
  if (!minutes.body || minutes.body.trim().length === 0) {
    return { error: "Meeting notes are empty. Please add notes before generating a summary." };
  }

  let summary: string;
  try {
    const { summary: overview, keyPoints } = await summarizeMeeting(minutes.body);
    const points = keyPoints.length
      ? `\n\nKey points:\n${keyPoints.map((p) => `- ${p}`).join("\n")}`
      : "";
    summary = `${overview}${points}`.trim();
  } catch (err) {
    return { error: `Summary generation failed: ${(err as Error).message}` };
  }

  const updatedMinutes = await prisma.minutes.update({
    where: { eventId },
    data: { summary },
  });

  await audit({
    actorId: user.id,
    action: "GENERATE_MINUTES_SUMMARY",
    entityType: "Minutes",
    entityId: updatedMinutes.id,
    metadata: { eventId },
    ministryId: event.ministryId,
  });

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true, summary };
}

// ── Save Minutes Draft ───────────────────────────────────────────────────────

const SaveDraftSchema = z.object({
  eventId: z.string().min(1),
  body: z.string(),
  summary: z.string().optional(),
});

export async function saveMinutesDraft(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = SaveDraftSchema.safeParse({
    eventId: formData.get("eventId"),
    body: formData.get("body") ?? "",
    summary: (formData.get("summary") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId, body, summary } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return { error: "Event not found or you don't have access." };

  const existing = await prisma.minutes.findUnique({ where: { eventId } });
  if (existing?.status !== "DRAFT") return { error: "Minutes are locked for review or already published." };

  const minutes = await prisma.minutes.upsert({
    where: { eventId },
    create: { eventId, body, summary, draftedById: user.id, draftedAt: new Date() },
    update: { body, summary },
  });

  await audit({
    actorId: user.id,
    action: "SAVE_MINUTES_DRAFT",
    entityType: "Minutes",
    entityId: minutes.id,
    metadata: { eventId },
    ministryId: event.ministryId,
  });

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true };
}

// ── Publish Minutes ──────────────────────────────────────────────────────────

const PublishSchema = z.object({
  eventId: z.string().min(1),
  minutesId: z.string().min(1),
});

export async function publishMinutes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const approver = await assertRole("APPROVER");

  const parsed = PublishSchema.safeParse({
    eventId: formData.get("eventId"),
    minutesId: formData.get("minutesId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId, minutesId } = parsed.data;

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (!minutes || minutes.eventId !== eventId) return { error: "Minutes not found." };
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      startAt: true,
      ministryId: true,
      attendees: {
        where: { status: { in: ["INVITED", "CONFIRMED"] } },
        select: {
          rsvpTokenHash: true,
          externalName: true,
          externalEmail: true,
          user: { select: { name: true, email: true, minutesNotifications: true } },
        },
      },
    },
  });
  if (!event) return { error: "Event not found." };
  assertSameMinistry(approver, event.ministryId);
  if (minutes.status === "PUBLISHED") return { error: "Already published." };
  if (minutes.status !== "SUBMITTED") return { error: "Minutes must be submitted for review before publishing." };

  await prisma.minutes.update({
    where: { id: minutesId },
    data: { status: "PUBLISHED", publishedAt: new Date(), approvedById: approver.id },
  });

  await audit({
    actorId: approver.id,
    action: "PUBLISH_MINUTES",
    entityType: "Minutes",
    entityId: minutesId,
    metadata: { eventId },
    ministryId: event.ministryId,
  });

  // Notify all invited/confirmed attendees about published minutes.
  const eventDate = event.startAt.toLocaleDateString("en-GB", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });

  await Promise.allSettled(
    event.attendees.map((a) => {
      // Internal attendees: send full link and SMS (if they opted in)
      if (a.user?.email && a.user.minutesNotifications !== false) {
        const minutesUrl = absoluteAppUrl(`/administrative/events/${eventId}/minutes`);
        return Promise.allSettled([
          sendMinutesEmail({
            to: a.user!.email,
            toName: a.user!.name ?? a.user!.email,
            eventTitle: event.title,
            eventDate,
            summary: minutes.summary,
            minutesUrl,
          }),
          sendMinutesSms({
            to: a.user!.email,
            toName: a.user!.name ?? a.user!.email,
            eventTitle: event.title,
          }),
        ]);
      }

      // External attendees: send guest portal link
      if (a.externalEmail && a.rsvpTokenHash) {
        const guestPortalUrl = absoluteAppUrl(`/guest/${a.rsvpTokenHash}/minutes`);
        return Promise.allSettled([
          sendMinutesEmail({
            to: a.externalEmail,
            toName: a.externalName ?? a.externalEmail,
            eventTitle: event.title,
            eventDate,
            summary: minutes.summary,
            minutesUrl: guestPortalUrl,
          }),
        ]);
      }

      // Fallback: do nothing if neither internal nor external email available
      return Promise.resolve();
    }),
  );

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true };
}

// ── Submit Minutes for Review ────────────────────────────────────────────────

const SubmitSchema = z.object({
  eventId: z.string().min(1),
  minutesId: z.string().min(1),
});

export async function submitMinutes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = SubmitSchema.safeParse({
    eventId: formData.get("eventId"),
    minutesId: formData.get("minutesId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId, minutesId } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return { error: "Event not found or you don't have access." };

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (!minutes || minutes.eventId !== eventId) return { error: "Minutes not found." };
  if (minutes.status !== "DRAFT") return { error: "Only draft minutes can be submitted for review." };

  await prisma.minutes.update({
    where: { id: minutesId },
    data: { status: "SUBMITTED", submittedAt: new Date(), submittedById: user.id },
  });

  await audit({
    actorId: user.id,
    action: "SUBMIT_MINUTES",
    entityType: "Minutes",
    entityId: minutesId,
    metadata: { eventId },
    ministryId: event.ministryId,
  });

  await notifyApproversOfSubmission({
    eventId,
    ministryId: event.ministryId,
    eventTitle: event.title,
    submitterName: user.name ?? user.email,
  });

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true };
}

// ── Add Action Item ──────────────────────────────────────────────────────────

const AddItemSchema = z.object({
  minutesId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  ownerName: z.string().optional(),
  dueDate: z.string().optional(),
  timezoneOffset: z.string().optional(),
  point: z.enum(["ACTION_POINT", "AGREED"]),
});

export async function addActionItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = AddItemSchema.safeParse({
    minutesId: formData.get("minutesId"),
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    ownerName: (formData.get("ownerName") as string) || undefined,
    dueDate: (formData.get("dueDate") as string) || undefined,
    timezoneOffset: (formData.get("timezoneOffset") as string) || undefined,
    point: formData.get("point") ?? "ACTION_POINT",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { minutesId, eventId, title, ownerName, dueDate, timezoneOffset, point } = parsed.data;
  const timeline = parseFutureTimeline(dueDate, timezoneOffset);
  if ("error" in timeline) return { error: timeline.error };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return { error: "Event not found or you don't have access." };

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (!minutes) return { error: "Minutes not found." };
  if (minutes.status !== "DRAFT") return { error: "Minutes are locked for review or already published." };

  const assignee = ownerName
    ? await resolveActionItemAssignee(event.ministryId, eventId, ownerName)
    : null;
  const ownerId = assignee?.kind === "internal" ? assignee.userId : null;

  const item = await prisma.actionItem.create({
    data: {
      minutesId,
      title,
      ownerId,
      ownerName: ownerName ?? null,
      dueDate: timeline.date,
      point,
    },
  });

  await audit({
    actorId: user.id,
    action: "ADD_ACTION_ITEM",
    entityType: "ActionItem",
    entityId: item.id,
    metadata: { minutesId, eventId, title },
    ministryId: event.ministryId,
  });

  // Notify internal users in-app/email, and external guests by email only.
  if (assignee?.kind === "internal") {
    await notifyActionItemOwner({ ownerId: assignee.userId, title, dueDate: item.dueDate, eventId, minutesId });
  } else if (assignee?.kind === "external") {
    await notifyExternalActionItemOwner({
      to: assignee.email,
      toName: assignee.name,
      title,
      dueDate: item.dueDate,
      eventId,
      attendeeId: assignee.attendeeId,
    });
  }

  await notifyMeetingInviteesActionItemCreated({
    eventId,
    title,
    ownerName: ownerName ?? null,
    dueDate: item.dueDate,
    exclusions: {
      userIds: assignee?.kind === "internal" ? [assignee.userId] : [],
      emails: assignee ? [assignee.email] : [],
    },
  });

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true };
}

// ── Update Action Item ───────────────────────────────────────────────────────

const UpdateItemSchema = z.object({
  itemId: z.string().min(1),
  minutesId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  ownerName: z.string().optional(),
  dueDate: z.string().optional(),
  timezoneOffset: z.string().optional(),
  point: z.enum(["ACTION_POINT", "AGREED"]),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

export async function updateActionItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = UpdateItemSchema.safeParse({
    itemId: formData.get("itemId"),
    minutesId: formData.get("minutesId"),
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    ownerName: (formData.get("ownerName") as string) || undefined,
    dueDate: (formData.get("dueDate") as string) || undefined,
    timezoneOffset: (formData.get("timezoneOffset") as string) || undefined,
    point: formData.get("point") ?? "ACTION_POINT",
    status: formData.get("status") ?? "TODO",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { itemId, minutesId, eventId, title, ownerName, dueDate, timezoneOffset, point, status } = parsed.data;
  const timeline = parseFutureTimeline(dueDate, timezoneOffset);
  if ("error" in timeline) return { error: timeline.error };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return { error: "Event not found or you don't have access." };

  const item = await prisma.actionItem.findUnique({ where: { id: itemId } });
  if (!item || item.minutesId !== minutesId) return { error: "Action item not found." };

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (minutes?.status !== "DRAFT") return { error: "Minutes are locked for review or already published." };

  const oldStatus = item.status as "TODO" | "IN_PROGRESS" | "DONE";
  const assignee = ownerName
    ? await resolveActionItemAssignee(event.ministryId, eventId, ownerName)
    : null;
  const ownerId = assignee?.kind === "internal" ? assignee.userId : null;
  const ownerChanged = assignee ? assigneeChanged(item, assignee, ownerName ?? null) : false;
  const ownerNameChanged = normalizeAssignee(item.ownerName) !== normalizeAssignee(ownerName);
  const dueDateChanged = (item.dueDate?.getTime() ?? null) !== (timeline.date?.getTime() ?? null);
  const resetReminder = ownerChanged || ownerNameChanged || dueDateChanged;

  await prisma.actionItem.update({
    where: { id: itemId },
    data: {
      title,
      ownerId,
      ownerName: ownerName ?? null,
      dueDate: timeline.date,
      ...(resetReminder ? { reminderSentAt: null } : {}),
      point,
      status,
    },
  });

  await audit({
    actorId: user.id,
    action: "UPDATE_ACTION_ITEM",
    entityType: "ActionItem",
    entityId: itemId,
    metadata: { minutesId, eventId, title, status },
    ministryId: event.ministryId,
  });

  // Notify new owner if ownership changed.
  if (ownerChanged && assignee?.kind === "internal") {
    await notifyActionItemOwner({
      ownerId: assignee.userId,
      title,
      dueDate: timeline.date,
      eventId,
      minutesId,
    });
  } else if (ownerChanged && assignee?.kind === "external") {
    await notifyExternalActionItemOwner({
      to: assignee.email,
      toName: assignee.name,
      title,
      dueDate: timeline.date,
      eventId,
      attendeeId: assignee.attendeeId,
    });
  }

  await notifyMeetingInviteesActionItemStatusChanged({
    eventId,
    title,
    oldStatus,
    newStatus: status,
  });

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true };
}

// ── Delete Action Item ───────────────────────────────────────────────────────

export async function deleteActionItem(formData: FormData): Promise<void> {
  const user = await requireUser();

  const itemId = String(formData.get("itemId") ?? "");
  const minutesId = String(formData.get("minutesId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");

  if (!itemId || !minutesId || !eventId) return;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return;

  const item = await prisma.actionItem.findUnique({ where: { id: itemId } });
  if (!item || item.minutesId !== minutesId) return;

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (minutes?.status !== "DRAFT") return;

  await prisma.actionItem.delete({ where: { id: itemId } });

  await audit({
    actorId: user.id,
    action: "DELETE_ACTION_ITEM",
    entityType: "ActionItem",
    entityId: itemId,
    metadata: { minutesId, eventId },
    ministryId: event.ministryId,
  });

  revalidatePath(`/administrative/events/${eventId}/minutes`);
}

// ── Internal helper ──────────────────────────────────────────────────────────

type ResolvedActionItemAssignee =
  | { kind: "internal"; userId: string; email: string }
  | { kind: "external"; attendeeId: string; name: string; email: string };

function normalizeAssignee(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

async function resolveActionItemAssignee(
  ministryId: string,
  eventId: string,
  ownerName: string,
): Promise<ResolvedActionItemAssignee | null> {
  const trimmed = ownerName.trim();
  if (!trimmed) return null;

  const user = await prisma.user.findFirst({
    where: {
      ministryId,
      systemRole: { not: "SUPER_ADMIN" },
      OR: [
        { name: { equals: trimmed, mode: "insensitive" } },
        { email: { equals: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true },
  });
  if (user) return { kind: "internal", userId: user.id, email: user.email };

  const externalByEmail = await prisma.eventAttendee.findFirst({
    where: {
      eventId,
      externalEmail: { equals: trimmed, mode: "insensitive" },
    },
    select: { id: true, externalName: true, externalEmail: true },
  });
  if (externalByEmail?.externalEmail) {
    return {
      kind: "external",
      attendeeId: externalByEmail.id,
      name: externalByEmail.externalName ?? externalByEmail.externalEmail,
      email: externalByEmail.externalEmail,
    };
  }

  const externalByName = await prisma.eventAttendee.findMany({
    where: {
      eventId,
      externalName: { equals: trimmed, mode: "insensitive" },
    },
    select: { id: true, externalName: true, externalEmail: true },
    take: 2,
  });
  const external = externalByName[0];
  if (externalByName.length === 1 && external?.externalEmail) {
    return {
      kind: "external",
      attendeeId: external.id,
      name: external.externalName ?? external.externalEmail,
      email: external.externalEmail,
    };
  }

  return null;
}

function assigneeChanged(
  item: { ownerId: string | null; ownerName: string | null },
  assignee: ResolvedActionItemAssignee,
  ownerName: string | null,
) {
  if (assignee.kind === "internal") return assignee.userId !== item.ownerId;
  return item.ownerId !== null || normalizeAssignee(item.ownerName) !== normalizeAssignee(ownerName);
}

async function notifyApproversOfSubmission({
  eventId, ministryId, eventTitle, submitterName,
}: { eventId: string; ministryId: string; eventTitle: string; submitterName: string }) {
  const approvers = await prisma.user.findMany({
    where: { ministryId, systemRole: "APPROVER", active: true },
    select: { id: true, name: true, email: true, ministryId: true },
  });
  if (approvers.length === 0) return;

  const minutesUrl = absoluteAppUrl(`/administrative/events/${eventId}/minutes`);

  await Promise.allSettled(
    approvers.map((a) =>
      Promise.allSettled([
        sendMinutesSubmittedEmail({
          to: a.email,
          toName: a.name ?? a.email,
          eventTitle,
          submitterName,
          minutesUrl,
        }),
        notify({
          userId: a.id,
          type: "MINUTES_SUBMITTED",
          title: "Minutes pending your approval",
          body: `${submitterName} submitted minutes for "${eventTitle}" for review.`,
          link: minutesUrl,
          ministryId: a.ministryId,
        }),
      ]),
    ),
  );
}

async function notifyExternalActionItemOwner({
  to, toName, title, dueDate, eventId, attendeeId,
}: {
  to: string;
  toName: string;
  title: string;
  dueDate: Date | null;
  eventId: string;
  attendeeId?: string;
}) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  if (!event) return;

  // Get guest portal URL if attendee ID is provided
  let minutesUrl: string | null = null;
  if (attendeeId) {
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: attendeeId },
      select: { rsvpTokenHash: true },
    });
    if (attendee?.rsvpTokenHash) {
      minutesUrl = absoluteAppUrl(`/guest/${attendee.rsvpTokenHash}/action-items`);
    }
  }

  await sendActionItemEmail({
    to,
    toName,
    title,
    eventTitle: event.title,
    dueDate,
    minutesUrl,
  });
}

async function notifyActionItemOwner({
  ownerId, title, dueDate, eventId,
}: {
  ownerId: string; title: string; dueDate: Date | null;
  eventId: string; minutesId?: string;
}) {
  const [owner, event] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, ministryId: true, actionItemNotifications: true },
    }),
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
  ]);
  if (!owner || !event) return;

  const minutesUrl = absoluteAppUrl(`/administrative/events/${eventId}/minutes`);
  const dueDateStr = dueDate ? dueDate.toLocaleDateString() : "No deadline set";
  const body = `Action item: ${title}\nTimeline: ${dueDateStr}`;

  await Promise.allSettled([
    owner.actionItemNotifications !== false
      ? sendActionItemEmail({
          to: owner.email,
          toName: owner.name ?? owner.email,
          title,
          eventTitle: event.title,
          dueDate,
          minutesUrl,
        })
      : Promise.resolve(),
    notify({
      userId: owner.id,
      type: "ACTION_ITEM",
      title: "New action item assigned",
      body,
      link: minutesUrl,
      ministryId: owner.ministryId,
    }),
  ]);
}
