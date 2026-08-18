"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, ministryScope } from "@/lib/guard";
import { canManageEvent, canReassignEvent } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { checkSlotConflicts, materializeOccurrences } from "@/lib/events";
import { materializeOccurrencesBatch } from "@/lib/events-batch";
import type { SystemRole } from "@/generated/prisma/enums";
import { generateOccurrences, MAX_OCCURRENCES } from "@/lib/recurrence";
import type { Prisma } from "@/generated/prisma/client";
import type {
  EventType,
  Classification,
  RecurrenceFrequency,
  RecurrenceEndType,
} from "@/generated/prisma/enums";

type Scope = "THIS" | "FUTURE" | "ALL";

// Validate the core event fields at the action boundary — mirrors the create path
// (events/actions.ts EventSchema) so invalid enum strings or Invalid Dates can never be
// cast straight into the DB columns. `description`/`roomId` keep their existing raw
// handling below to preserve current clear-on-empty behavior.
const UpdateEventSchema = z
  .object({
    title: z.string().min(2, "Title is required"),
    type: z.enum(["MEETING", "CONFERENCE", "APPOINTMENT"]),
    eventScope: z.enum(["OFFICIAL", "TEAM"]).default("TEAM"),
    classification: z.enum(["PUBLIC", "RESTRICTED"]).default("PUBLIC"),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

function fmt(d: Date) {
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export async function updateEvent(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();
  const eventId = formData.get("eventId") as string;
  const description = formData.get("description") as string;
  const roomId = (formData.get("roomId") as string) || null;
  const scope = ((formData.get("editScope") as string) || "THIS") as Scope;
  const editPattern = formData.get("editPattern") === "true";

  if (!eventId) return { error: "Event ID is required" };

  const parsed = UpdateEventSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    eventScope: formData.get("eventScope") || "TEAM",
    classification: formData.get("classification") || "PUBLIC",
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { title, type, eventScope, classification, startAt, endAt } = parsed.data;

  const anchor = await prisma.event.findFirst({
    where: {
      id: eventId,
      ...(ministryScope(user) as Prisma.EventWhereInput),
    },
    select: {
      id: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
      startAt: true,
      seriesId: true,
      venueName: true,
      venueLat: true,
      venueLng: true,
      geofenceRadius: true,
      colorCategory: true,
      ministryId: true,
      ministry: {
        select: {
          compoundMaxGpsAccuracy: true,
        },
      },
    },
  });
  if (
    !anchor ||
    !canManageEvent(user, {
      ministryId: anchor.ministryId,
      organizerId: anchor.organizerId,
      coOrganizerIds: anchor.coOrganizers.map((c) => c.id),
    })
  ) {
    return { error: "You do not have permission to edit this event" };
  }

  // ── Change the repeat pattern: regenerate occurrences from the anchor. ──
  if (editPattern && anchor.seriesId) {
    const freq = formData.get("recurrenceFreq") as string;
    if (!freq || freq === "NONE") return { error: "Choose a repeat frequency." };
    const interval = Math.max(1, parseInt(String(formData.get("recurrenceInterval") ?? "1"), 10) || 1);
    const endType = formData.get("recurrenceEndType") as string;
    const count = formData.get("recurrenceCount") ? parseInt(String(formData.get("recurrenceCount")), 10) : undefined;
    const untilStr = formData.get("recurrenceUntil") as string;
    const until = untilStr ? new Date(untilStr) : undefined;
    const patternScope = ((formData.get("patternScope") as string) || "FUTURE") as "FUTURE" | "ALL";

    if (!endType) return { error: "Choose how the repeat ends." };
    if (endType === "COUNT" && !count) return { error: "Enter how many times it repeats." };
    if (endType === "UNTIL" && !until) return { error: "Choose an end date for the repeat." };

    const slots = generateOccurrences({
      startAt,
      endAt,
      frequency: freq as RecurrenceFrequency,
      interval,
      endType: endType as RecurrenceEndType,
      count,
      until,
    });
    if (slots.length === 0) return { error: "This repeat produces no dates — check the end condition." };
    if (slots.length > MAX_OCCURRENCES) {
      return { error: `Too many occurrences (max ${MAX_OCCURRENCES}). Use a nearer end date or fewer repeats.` };
    }

    let room: { id: string } | null = null;
    if (roomId) {
      room = await prisma.room.findFirst({
        where: { id: roomId, ...ministryScope(user) } as Prisma.RoomWhereInput,
        select: { id: true },
      });
      if (!room) return { error: "Room not found or you don't have access" };
    }
    // Optimized batch conflict check for all slots in regenerated series.
    // Old: sequential for loop with N findSlotConflict() calls
    // New: single checkSlotConflicts() batches all checks together
    const conflictMapRegen = await checkSlotConflicts({
      slots,
      roomId,
      venueName: anchor.venueName,
      excludeSeriesId: anchor.seriesId,
    });
    
    if (conflictMapRegen.size > 0) {
      const [slotIndex, reason] = Array.from(conflictMapRegen.entries())[0];
      return { error: `Cannot update — ${fmt(slots[slotIndex].startAt)} clashes: ${reason}` };
    }

    // Carry the current invitee list onto every regenerated occurrence.
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: anchor.id },
      select: {
        userId: true,
        externalEmail: true,
        externalName: true,
        status: true,
        rsvpTokenHash: true,
        respondedAt: true,
      },
    });
    const invitees = attendees.map((a) => ({
      email: a.externalEmail ?? "",
      name: a.externalName ?? "",
      userId: a.userId,
      status: a.status,
      rsvpTokenHash: a.rsvpTokenHash,
      respondedAt: a.respondedAt,
    }));

    const base = {
      title,
      description,
      type: type as EventType,
      scope: eventScope as "OFFICIAL" | "TEAM",
      classification: classification as Classification,
      roomId,
      venueName: anchor.venueName,
      venueLat: anchor.venueLat,
      venueLng: anchor.venueLng,
      geofenceRadius: anchor.geofenceRadius,
      colorCategory: anchor.colorCategory,
      organizerId: anchor.organizerId,
      ministryId: anchor.ministryId,
    } as unknown as Omit<Prisma.EventCreateInput, "startAt" | "endAt" | "seriesId">;

    const deleteWhere =
      patternScope === "ALL"
        ? { seriesId: anchor.seriesId }
        : { seriesId: anchor.seriesId, startAt: { gte: anchor.startAt } };

    const firstId = await prisma.$transaction(async (tx) => {
      await tx.eventSeries.update({
        where: { id: anchor.seriesId! },
        data: {
          frequency: freq as RecurrenceFrequency,
          interval,
          endType: endType as RecurrenceEndType,
          count: count ?? null,
          until: until ?? null,
        },
      });
      await tx.event.deleteMany({ where: deleteWhere });
      // OPTIMIZATION: Use batch function for enterprise-scale performance
      // Instead of 156 queries (52 events × 3), this uses 4 queries
      return materializeOccurrencesBatch(tx, {
        slots,
        seriesId: anchor.seriesId,
        base,
        invitees,
        coOrganizerIds: anchor.coOrganizers.map(c => c.id),
      });
    });

    await audit({
      actorId: user.id,
      action: "UPDATE_EVENT_PATTERN",
      entityType: "Event",
      entityId: firstId,
      metadata: { title, patternScope, frequency: freq, occurrences: slots.length },
      ministryId: user.ministryId,
    });

    revalidatePath("/administrative/calendar");
    revalidatePath("/administrative");
    redirect(`/administrative/events/${firstId}`);
  }

  const event = anchor;
  try {

    // Resolve which occurrences this edit applies to.
    let targets: { id: string; startAt: Date }[];
    if (event.seriesId && (scope === "FUTURE" || scope === "ALL")) {
      targets = await prisma.event.findMany({
        where: {
          seriesId: event.seriesId,
          ...(scope === "FUTURE" ? { startAt: { gte: event.startAt } } : {}),
        },
        select: { id: true, startAt: true },
        orderBy: { startAt: "asc" },
      });
    } else {
      targets = [{ id: event.id, startAt: event.startAt }];
    }

    // FUTURE/ALL keep each occurrence's own date and only shift the time-of-day;
    // THIS moves the single occurrence to the submitted date+time.
    const preserveDates = scope !== "THIS";
    const durationMs = endAt.getTime() - startAt.getTime();

    let room: { id: string } | null = null;
    if (roomId) {
      room = await prisma.room.findFirst({
        where: { id: roomId, ...ministryScope(user) } as Prisma.RoomWhereInput,
        select: { id: true },
      });
      if (!room) return { error: "Room not found or you don't have access" };
    }
    // Compute new times per target and batch check all for room conflicts.
    // Build the update plan with new times first, then batch check conflicts.
    const updates: { id: string; startAt: Date; endAt: Date; reschedule: boolean }[] = [];
    const newSlots: Array<{ id: string; startAt: Date; endAt: Date }> = [];
    
    for (const t of targets) {
      const ns = preserveDates
        ? new Date(t.startAt.getFullYear(), t.startAt.getMonth(), t.startAt.getDate(), startAt.getHours(), startAt.getMinutes(), 0, 0)
        : startAt;
      const ne = preserveDates ? new Date(ns.getTime() + durationMs) : endAt;
      newSlots.push({ id: t.id, startAt: ns, endAt: ne });
    }

    // Optimized batch conflict check for all rescheduled occurrences.
    // Old: sequential for loop with N findSlotConflict() calls
    // New: single checkSlotConflicts() batches all checks together
    const conflictMapReschedule = await checkSlotConflicts({
      slots: newSlots.map(s => ({ startAt: s.startAt, endAt: s.endAt })),
      roomId,
      venueName: null,
      excludeSeriesId: event.seriesId ?? undefined,
    });

    if (conflictMapReschedule.size > 0) {
      const [slotIndex, reason] = Array.from(conflictMapReschedule.entries())[0];
      return { error: `Cannot update — ${fmt(newSlots[slotIndex].startAt)} clashes: ${reason}` };
    }

    // Build final updates list with calculated reschedule flags
    for (const s of newSlots) {
      const t = targets.find(target => target.id === s.id)!;
      updates.push({ id: t.id, startAt: s.startAt, endAt: s.endAt, reschedule: t.startAt.getTime() !== s.startAt.getTime() });
    }

    await prisma.$transaction(async (tx) => {
      // Separate updates into rescheduled and non-rescheduled for batch operations
      const rescheduledIds = updates.filter(u => u.reschedule).map(u => u.id);
      const nonRescheduledIds = updates.filter(u => !u.reschedule).map(u => u.id);
      const updateIdsToTimes = new Map(updates.map(u => [u.id, { startAt: u.startAt, endAt: u.endAt }]));

      const commonData = {
        title,
        description,
        type: type as EventType,
        scope: eventScope as "OFFICIAL" | "TEAM",
        classification: classification as Classification,
        roomId,
      };

      // Batch update all events with common fields (must do individually for per-record startAt/endAt)
      // Since Prisma doesn't support per-record value updates in updateMany, we need a different approach
      await Promise.all(
        updates.map(u =>
          tx.event.update({
            where: { id: u.id },
            data: {
              ...commonData,
              startAt: u.startAt,
              endAt: u.endAt,
              // Re-arm the 1h-before reminder for any rescheduled occurrence
              ...(u.reschedule ? { reminderSentAt: null } : {}),
            },
          })
        )
      );
    });

    await audit({
      actorId: user.id,
      action: "UPDATE_EVENT",
      entityType: "Event",
      entityId: eventId,
      metadata: { title, scope, count: updates.length },
      ministryId: user.ministryId,
    });

    revalidatePath("/administrative/calendar");
    revalidatePath("/administrative");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update event:", err);
    return { error: "Failed to update event" };
  }
}

/** Cancel/delete an event, or a scope of its series. Cascades clear per-event data. */
export async function deleteEvent(
  eventId: string,
  scope: Scope = "THIS",
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(ministryScope(user) as Prisma.EventWhereInput),
      },
      select: {
        id: true,
        organizerId: true,
        coOrganizers: { select: { id: true } },
        ministryId: true,
        startAt: true,
        seriesId: true,
      },
    });
    if (
      !event ||
      !canManageEvent(user, {
        ministryId: event.ministryId,
        organizerId: event.organizerId,
        coOrganizerIds: event.coOrganizers.map((c) => c.id),
      })
    ) {
      return { error: "You do not have permission to cancel this event" };
    }

    const where = {
      ...ministryScope(user),
      ...(event.seriesId && (scope === "FUTURE" || scope === "ALL")
        ? { seriesId: event.seriesId, ...(scope === "FUTURE" ? { startAt: { gte: event.startAt } } : {}) }
        : { id: eventId }),
    } as Prisma.EventWhereInput;

    const res = await prisma.event.deleteMany({ where });

    // Clean up the parent series if this delete emptied it (Event.seriesId is
    // SetNull on delete, so an emptied EventSeries would otherwise be orphaned).
    if (event.seriesId) {
      const remaining = await prisma.event.count({ where: { seriesId: event.seriesId } });
      if (remaining === 0) {
        await prisma.eventSeries.delete({ where: { id: event.seriesId } }).catch(() => {});
      }
    }

    await audit({
      actorId: user.id,
      action: "DELETE_EVENT",
      entityType: "Event",
      entityId: eventId,
      metadata: { scope, count: res.count },
      ministryId: user.ministryId,
    });

    revalidatePath("/administrative/calendar");
    revalidatePath("/administrative");
    return { ok: true };
  } catch (err) {
    console.error("Failed to cancel event:", err);
    return { error: "Failed to cancel event" };
  }
}

// ── Co-organizers: hand an event off to another ministry user to help run it ──

/** Load an event (ministry-scoped) with the fields needed for reassign checks. */
async function loadEventForReassign(
  user: { systemRole: SystemRole; ministryId: string | null },
  eventId: string,
) {
  return prisma.event.findFirst({
    where: { id: eventId, ...(ministryScope(user) as Prisma.EventWhereInput) },
    select: {
      id: true,
      ministryId: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
    },
  });
}

export async function addCoOrganizer(
  eventId: string,
  userId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const event = await loadEventForReassign(user, eventId);
    if (!event) return { error: "Event not found" };

    const coOrganizerIds = event.coOrganizers.map((c) => c.id);
    if (!canReassignEvent(user, { ministryId: event.ministryId, organizerId: event.organizerId, coOrganizerIds })) {
      return { error: "You do not have permission to reassign this event" };
    }

    if (userId === event.organizerId) return { error: "That user is already the organizer" };
    if (coOrganizerIds.includes(userId)) return { error: "That user is already a co-organizer" };

    // Assignee must be a (non-super-admin) member of the same ministry.
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, systemRole: true, ministryId: true },
    });
    if (!target || target.systemRole === "SUPER_ADMIN" || target.ministryId !== event.ministryId) {
      return { error: "Pick a user from this ministry" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { coOrganizers: { connect: { id: userId } } },
    });

    await audit({
      actorId: user.id,
      action: "ADD_CO_ORGANIZER",
      entityType: "Event",
      entityId: eventId,
      metadata: { coOrganizerId: userId, coOrganizerEmail: target.email },
      ministryId: event.ministryId,
    });

    revalidatePath(`/administrative/events/${eventId}`);
    revalidatePath("/administrative/calendar");
    return { ok: true };
  } catch (err) {
    console.error("Failed to add co-organizer:", err);
    return { error: "Failed to add co-organizer" };
  }
}

export async function removeCoOrganizer(
  eventId: string,
  userId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const event = await loadEventForReassign(user, eventId);
    if (!event) return { error: "Event not found" };

    const coOrganizerIds = event.coOrganizers.map((c) => c.id);
    if (!canReassignEvent(user, { ministryId: event.ministryId, organizerId: event.organizerId, coOrganizerIds })) {
      return { error: "You do not have permission to reassign this event" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { coOrganizers: { disconnect: { id: userId } } },
    });

    await audit({
      actorId: user.id,
      action: "REMOVE_CO_ORGANIZER",
      entityType: "Event",
      entityId: eventId,
      metadata: { coOrganizerId: userId },
      ministryId: event.ministryId,
    });

    revalidatePath(`/administrative/events/${eventId}`);
    revalidatePath("/administrative/calendar");
    return { ok: true };
  } catch (err) {
    console.error("Failed to remove co-organizer:", err);
    return { error: "Failed to remove co-organizer" };
  }
}

export async function publishEvent(eventId: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isPublic: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    if (!event.isPublic) {
      return { error: "Only public events can be published" };
    }

    const coOrganizerIds = event.coOrganizers.map((c) => c.id);
    if (!canManageEvent(user, { ministryId: event.ministryId, organizerId: event.organizerId, coOrganizerIds })) {
      return { error: "You do not have permission to publish this event" };
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    await audit({
      actorId: user.id,
      action: "PUBLISH_EVENT",
      entityType: "Event",
      entityId: eventId,
      metadata: { title: updated.title },
      ministryId: event.ministryId,
    });

    revalidatePath(`/administrative/events/${eventId}`);
    revalidatePath("/administrative/calendar");
    revalidatePath("/public-calendar");
    return { ok: true };
  } catch (err) {
    console.error("Failed to publish event:", err);
    return { error: "Failed to publish event" };
  }
}

export async function unpublishEvent(eventId: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isPublic: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    if (!event.isPublic) {
      return { error: "Only public events can be unpublished" };
    }

    const coOrganizerIds = event.coOrganizers.map((c) => c.id);
    if (!canManageEvent(user, { ministryId: event.ministryId, organizerId: event.organizerId, coOrganizerIds })) {
      return { error: "You do not have permission to unpublish this event" };
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
    });

    await audit({
      actorId: user.id,
      action: "UNPUBLISH_EVENT",
      entityType: "Event",
      entityId: eventId,
      metadata: { title: updated.title },
      ministryId: event.ministryId,
    });

    revalidatePath(`/administrative/events/${eventId}`);
    revalidatePath("/administrative/calendar");
    revalidatePath("/public-calendar");
    return { ok: true };
  } catch (err) {
    console.error("Failed to unpublish event:", err);
    return { error: "Failed to unpublish event" };
  }
}
