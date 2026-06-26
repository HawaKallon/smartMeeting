"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertStaffRole, ministryScope, assertSameMinistry } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { findSlotConflict, materializeOccurrences } from "@/lib/events";
import { sendInviteEmail } from "@/lib/email";
import { generateOccurrences, describeRecurrence, MAX_OCCURRENCES } from "@/lib/recurrence";
import type { RecurrenceFrequency } from "@/generated/prisma/enums";

const EventSchema = z
  .object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional(),
    type: z.enum(["MEETING", "CONFERENCE", "APPOINTMENT"]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    venueName: z.string().optional(),
    venueLat: z.coerce.number().min(-90).max(90).optional(),
    venueLng: z.coerce.number().min(-180).max(180).optional(),
    geofenceRadius: z.coerce.number().int().positive().max(10000).default(100),
    colorCategory: z.enum(["RED", "AMBER", "GREEN"]).optional(),
    classification: z.enum(["PUBLIC", "RESTRICTED"]).default("PUBLIC"),
    roomId: z.string().optional(),
    // Recurrence (NONE = a single event, the default).
    recurrenceFreq: z.enum(["NONE", "DAILY", "WEEKLY", "WEEKDAYS", "MONTHLY"]).default("NONE"),
    recurrenceInterval: z.coerce.number().int().positive().max(52).default(1),
    recurrenceEndType: z.enum(["COUNT", "UNTIL"]).optional(),
    recurrenceCount: z.coerce.number().int().positive().max(MAX_OCCURRENCES).optional(),
    recurrenceUntil: z.coerce.date().optional(),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

export type ActionState = { error?: string } | undefined;

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertStaffRole();

  const parsed = EventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    venueName: formData.get("venueName") || undefined,
    venueLat: formData.get("venueLat") || undefined,
    venueLng: formData.get("venueLng") || undefined,
    geofenceRadius: formData.get("geofenceRadius") || 100,
    colorCategory: formData.get("colorCategory") || undefined,
    classification: formData.get("classification") || "PUBLIC",
    roomId: formData.get("roomId") || undefined,
    recurrenceFreq: formData.get("recurrenceFreq") || "NONE",
    recurrenceInterval: formData.get("recurrenceInterval") || 1,
    recurrenceEndType: formData.get("recurrenceEndType") || undefined,
    recurrenceCount: formData.get("recurrenceCount") || undefined,
    recurrenceUntil: formData.get("recurrenceUntil") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Fetch room coords once (copied onto each occurrence's geofence).
  let room = null;
  if (data.roomId) {
    room = await prisma.room.findFirst({
      where: { id: data.roomId, ...ministryScope(user) },
      select: { latitude: true, longitude: true },
    });
    if (!room) {
      return { error: "Room not found or you don't have access" };
    }
  }
  const venueLat = data.venueLat ?? (room?.latitude || null);
  const venueLng = data.venueLng ?? (room?.longitude || null);

  // Build the occurrence slots — one for a single event, many for a series.
  const recurring = data.recurrenceFreq !== "NONE";
  let slots: { startAt: Date; endAt: Date }[];
  if (recurring) {
    if (!data.recurrenceEndType) return { error: "Choose how the repeat ends." };
    if (data.recurrenceEndType === "COUNT" && !data.recurrenceCount)
      return { error: "Enter how many times it repeats." };
    if (data.recurrenceEndType === "UNTIL" && !data.recurrenceUntil)
      return { error: "Choose an end date for the repeat." };

    slots = generateOccurrences({
      startAt: data.startAt,
      endAt: data.endAt,
      frequency: data.recurrenceFreq as RecurrenceFrequency,
      interval: data.recurrenceInterval,
      endType: data.recurrenceEndType,
      count: data.recurrenceCount,
      until: data.recurrenceUntil,
    });
    if (slots.length === 0) return { error: "This repeat produces no dates — check the end condition." };
    if (slots.length >= MAX_OCCURRENCES)
      return { error: `Too many occurrences (max ${MAX_OCCURRENCES}). Use a nearer end date or fewer repeats.` };
  } else {
    slots = [{ startAt: data.startAt, endAt: data.endAt }];
  }

  // Block-on-clash: every occurrence must be free before anything is created.
  const conflicts: string[] = [];
  for (const s of slots) {
    const reason = await findSlotConflict({
      roomId: data.roomId,
      venueName: data.venueName ?? null,
      startAt: s.startAt,
      endAt: s.endAt,
    });
    if (reason) {
      conflicts.push(`${s.startAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} — ${reason}`);
    }
  }
  if (conflicts.length) {
    const shown = conflicts.slice(0, 3).join("; ");
    const more = conflicts.length > 3 ? ` …and ${conflicts.length - 3} more` : "";
    return { error: `Cannot create — ${conflicts.length} date(s) clash: ${shown}${more}` };
  }

  // Resolve invitees once (registered user vs external guest), reused per occurrence.
  type Resolved = { email: string; name: string; userId: string | null };
  let resolved: Resolved[] = [];
  const inviteesRaw = formData.get("invitees");
  if (inviteesRaw) {
    let invites: { email: string; name?: string }[] = [];
    try { invites = JSON.parse(String(inviteesRaw)); } catch { /* ignore */ }
    resolved = await Promise.all(
      invites.map(async (inv) => {
        const u = await prisma.user.findUnique({
          where: { email: inv.email.toLowerCase() },
          select: { id: true, name: true },
        });
        return { email: inv.email, name: u?.name ?? inv.name ?? inv.email, userId: u?.id ?? null };
      }),
    );
  }

  const base = {
    title: data.title,
    description: data.description,
    type: data.type,
    venueName: data.venueName,
    venueLat,
    venueLng,
    geofenceRadius: data.geofenceRadius,
    colorCategory: data.colorCategory,
    classification: data.classification,
    roomId: data.roomId || null,
    organizerId: user.id,
    ministryId: user.ministryId!,
  };

  // Create the series record (if any), all occurrences, and per-occurrence
  // invitee rows atomically.
  const firstId = await prisma.$transaction(async (tx) => {
    let seriesId: string | null = null;
    if (recurring) {
      const series = await tx.eventSeries.create({
        data: {
          frequency: data.recurrenceFreq as RecurrenceFrequency,
          interval: data.recurrenceInterval,
          endType: data.recurrenceEndType!,
          count: data.recurrenceCount ?? null,
          until: data.recurrenceUntil ?? null,
          organizerId: user.id,
          ministryId: user.ministryId!,
        },
      });
      seriesId = series.id;
    }
    return materializeOccurrences(tx, { slots, seriesId, base, invitees: resolved });
  });

  await audit({
    actorId: user.id,
    action: recurring ? "CREATE_EVENT_SERIES" : "CREATE_EVENT",
    entityType: "Event",
    entityId: firstId,
    metadata: { title: data.title, occurrences: slots.length },
    ministryId: user.ministryId,
  });

  // One invite email per invitee (not one per occurrence).
  if (resolved.length) {
    let roomName: string | null = null;
    if (data.roomId) {
      const r = await prisma.room.findFirst({
        where: { id: data.roomId, ...ministryScope(user) },
        select: { name: true },
      });
      roomName = r?.name ?? null;
    }
    const organizerName = user.name ?? user.email;
    const recurrenceText = recurring
      ? describeRecurrence({
          frequency: data.recurrenceFreq as RecurrenceFrequency,
          interval: data.recurrenceInterval,
          endType: data.recurrenceEndType!,
          count: data.recurrenceCount,
          until: data.recurrenceUntil,
        })
      : null;
    await Promise.allSettled(
      resolved.map((r) =>
        sendInviteEmail({
          to: r.email,
          toName: r.name,
          eventTitle: recurrenceText ? `${data.title} (${recurrenceText})` : data.title,
          startAt: slots[0].startAt,
          venueName: data.venueName ?? null,
          roomName,
          organizerName,
        }),
      ),
    );
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/events/${firstId}`);
}

export async function checkRoomAvailability(
  roomId: string,
  startAt: string,
  endAt: string,
  excludeEventId?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (!roomId || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { ok: true };
    }

    if (end <= start) {
      return { ok: false, error: "End time must be after start time" };
    }

    // Check room bookings (omitted for now as checkRoomAvailability is read-only helper)
    // Note: full scoping would require passing user context to this function
    const roomConflict = await prisma.roomBooking.findFirst({
      where: {
        roomId,
        status: "CONFIRMED",
        OR: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
    });

    if (roomConflict) {
      return { ok: false, error: "Room is already booked for this time" };
    }

    // Check event conflicts
    const eventWhere: any = {
      roomId,
      startAt: { lt: end },
      endAt: { gt: start },
    };

    // Exclude current event if updating
    if (excludeEventId) {
      eventWhere.id = { not: excludeEventId };
    }

    const eventConflict = await prisma.event.findFirst({
      where: eventWhere,
    });

    if (eventConflict) {
      return { ok: false, error: "Room is already scheduled for an event at this time" };
    }

    return { ok: true };
  } catch (err) {
    console.error("Room availability check failed:", err);
    return { ok: false, error: "Failed to check room availability" };
  }
}
