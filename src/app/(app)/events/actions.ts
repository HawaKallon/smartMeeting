"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertStaffRole } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { hasVenueConflict } from "@/lib/events";
import { sendInviteEmail } from "@/lib/email";

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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const conflict = await hasVenueConflict({
    venueName: data.venueName ?? null,
    startAt: data.startAt,
    endAt: data.endAt,
  });
  if (conflict) {
    return { error: `Venue "${data.venueName}" is already booked for that time.` };
  }

  // Check room availability if room selected
  if (data.roomId) {
    // Check for ANY conflicting events on the same room first
    const eventConflict = await prisma.event.findFirst({
      where: {
        roomId: data.roomId,
        startAt: { lt: data.endAt },
        endAt: { gt: data.startAt },
      },
    });

    if (eventConflict) {
      return { error: "Another event is already scheduled in this room at this time." };
    }

    // Check room bookings
    const roomConflict = await prisma.roomBooking.findFirst({
      where: {
        roomId: data.roomId,
        status: "CONFIRMED",
        startTime: { lt: data.endAt },
        endTime: { gt: data.startAt },
      },
    });

    if (roomConflict) {
      return { error: "Room is already booked for this time." };
    }
  }

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      startAt: data.startAt,
      endAt: data.endAt,
      venueName: data.venueName,
      venueLat: data.venueLat,
      venueLng: data.venueLng,
      geofenceRadius: data.geofenceRadius,
      colorCategory: data.colorCategory,
      classification: data.classification,
      roomId: data.roomId || null,
      organizerId: user.id,
    },
  });

  await audit({
    actorId: user.id,
    action: "CREATE_EVENT",
    entityType: "Event",
    entityId: event.id,
    metadata: { title: event.title },
  });

  // Handle invitees added at creation time.
  const inviteesRaw = formData.get("invitees");
  if (inviteesRaw) {
    type Invite = { email: string; name?: string };
    let invites: Invite[] = [];
    try { invites = JSON.parse(String(inviteesRaw)); } catch { /* ignore */ }

    const organizerName = user.name ?? user.email;

    // Fetch room info if assigned
    let roomName: string | null = null;
    if (event.roomId) {
      const room = await prisma.room.findUnique({
        where: { id: event.roomId },
        select: { name: true },
      });
      roomName = room?.name ?? null;
    }

    await Promise.allSettled(
      invites.map(async (invite) => {
        // Match to a registered user if possible.
        const existing = await prisma.user.findUnique({
          where: { email: invite.email.toLowerCase() },
          select: { id: true, name: true, email: true },
        });

        await prisma.eventAttendee.create({
          data: existing
            ? { eventId: event.id, userId: existing.id, status: "INVITED" }
            : { eventId: event.id, externalEmail: invite.email, externalName: invite.name ?? invite.email, status: "INVITED" },
        });

        try {
          await sendInviteEmail({
            to: invite.email,
            toName: existing?.name ?? invite.name ?? invite.email,
            eventTitle: event.title,
            startAt: event.startAt,
            venueName: event.venueName,
            roomName: roomName,
            organizerName,
          });
          console.log(`[email] Invite sent to ${invite.email}`);
        } catch (err) {
          console.error(`[email] Failed to send invite to ${invite.email}:`, err);
        }
      }),
    );
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/events/${event.id}`);
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

    // Check room bookings
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
