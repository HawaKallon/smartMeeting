"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertRole, requireUser, assertSameMinistry } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { sendMinutesEmail, sendActionItemEmail } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/appUrl";
import { sendMinutesSms, sendActionItemSms } from "@/lib/sms";
import { summarizeMeeting } from "@/lib/llm";
import { canManageExistingEvent } from "@/lib/eventAccess";

export type ActionState = { error?: string; ok?: true } | undefined;

type Segment = { speaker: string; start: number; end: number; text: string };

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
  if (existing?.status === "PUBLISHED") return { error: "Minutes are published and cannot be edited." };

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
  if (existing?.status === "PUBLISHED") return { error: "Minutes are published and cannot be edited." };

  const minutes = await prisma.minutes.upsert({
    where: { eventId },
    create: { eventId, body, summary },
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
  const approver = await assertRole("PERMANENT_SECRETARY", "DEPUTY_SECRETARY");

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
    select: { title: true, startAt: true, ministryId: true, attendees: {
      where: { status: { in: ["INVITED", "CONFIRMED"] } },
      include: { user: { select: { name: true, email: true } } },
    } },
  });
  if (!event) return { error: "Event not found." };
  assertSameMinistry(approver, event.ministryId);
  if (minutes.status === "PUBLISHED") return { error: "Already published." };

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
  const minutesUrl = absoluteAppUrl(`/administrative/events/${eventId}/minutes`);

  await Promise.allSettled(
    event.attendees
      .filter((a) => a.user?.email)
      .map((a) =>
        Promise.allSettled([
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
        ])
      ),
  );

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true };
}

// ── Add Action Item ──────────────────────────────────────────────────────────

const AddItemSchema = z.object({
  minutesId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  ownerId: z.string().optional(),
  dueDate: z.string().optional(),
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
    ownerId: (formData.get("ownerId") as string) || undefined,
    dueDate: (formData.get("dueDate") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { minutesId, eventId, title, ownerId, dueDate } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return { error: "Event not found or you don't have access." };

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (!minutes) return { error: "Minutes not found." };
  if (minutes.status === "PUBLISHED") return { error: "Minutes are published and cannot be edited." };

  const item = await prisma.actionItem.create({
    data: {
      minutesId,
      title,
      ownerId: ownerId ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
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

  // Notify the owner if one was assigned.
  if (ownerId) {
    await notifyActionItemOwner({ ownerId, title, dueDate: item.dueDate, eventId, minutesId });
  }

  revalidatePath(`/administrative/events/${eventId}/minutes`);
  return { ok: true };
}

// ── Update Action Item ───────────────────────────────────────────────────────

const UpdateItemSchema = z.object({
  itemId: z.string().min(1),
  minutesId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  ownerId: z.string().optional(),
  dueDate: z.string().optional(),
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
    ownerId: (formData.get("ownerId") as string) || undefined,
    dueDate: (formData.get("dueDate") as string) || undefined,
    status: formData.get("status") ?? "TODO",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { itemId, minutesId, eventId, title, ownerId, dueDate, status } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
  });
  if (!event || !canManageExistingEvent(user, event)) return { error: "Event not found or you don't have access." };

  const item = await prisma.actionItem.findUnique({ where: { id: itemId } });
  if (!item || item.minutesId !== minutesId) return { error: "Action item not found." };

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (minutes?.status === "PUBLISHED") return { error: "Minutes are published and cannot be edited." };

  const ownerChanged = ownerId && ownerId !== item.ownerId;

  await prisma.actionItem.update({
    where: { id: itemId },
    data: {
      title,
      ownerId: ownerId ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
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
  if (ownerChanged) {
    await notifyActionItemOwner({
      ownerId: ownerId!,
      title,
      dueDate: dueDate ? new Date(dueDate) : null,
      eventId,
      minutesId,
    });
  }

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
  if (minutes?.status === "PUBLISHED") return;

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

async function notifyActionItemOwner({
  ownerId, title, dueDate, eventId, minutesId,
}: {
  ownerId: string; title: string; dueDate: Date | null;
  eventId: string; minutesId: string;
}) {
  const [owner, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, email: true } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
  ]);
  if (!owner || !event) return;

  const minutesUrl = absoluteAppUrl(`/administrative/events/${eventId}/minutes`);

  await Promise.allSettled([
    sendActionItemEmail({
      to: owner.email,
      toName: owner.name ?? owner.email,
      title,
      eventTitle: event.title,
      dueDate,
      minutesUrl,
    }),
    sendActionItemSms({
      to: owner.email, // phone field would replace this in a full implementation
      toName: owner.name ?? owner.email,
      title,
      dueDate,
    }),
  ]);
}
