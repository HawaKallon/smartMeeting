import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Double-booking check (PRD §6.5): returns true if the given venue already has
 * an overlapping event in [startAt, endAt). Venue match is by name (case-insensitive).
 * Events with no venue are never considered to clash.
 */
export async function hasVenueConflict(params: {
  venueName: string | null;
  startAt: Date;
  endAt: Date;
  excludeEventId?: string;
}): Promise<boolean> {
  const { venueName, startAt, endAt, excludeEventId } = params;
  if (!venueName) return false;

  const clash = await prisma.event.findFirst({
    where: {
      id: excludeEventId ? { not: excludeEventId } : undefined,
      venueName: { equals: venueName, mode: "insensitive" },
      // overlap: existing.start < new.end AND existing.end > new.start
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  return clash !== null;
}

/**
 * Returns a human-readable reason string if the given room/venue slot clashes
 * with an existing event or confirmed room booking, otherwise null. Used by
 * single-event and per-occurrence (recurring) conflict checks alike.
 */
export async function findSlotConflict(params: {
  roomId?: string | null;
  venueName?: string | null;
  startAt: Date;
  endAt: Date;
  excludeEventId?: string;
  excludeSeriesId?: string;
}): Promise<string | null> {
  const { roomId, venueName, startAt, endAt, excludeEventId, excludeSeriesId } = params;

  if (venueName && (await hasVenueConflict({ venueName, startAt, endAt, excludeEventId }))) {
    return `venue "${venueName}" is already booked`;
  }

  if (roomId) {
    const eventClash = await prisma.event.findFirst({
      where: {
        roomId,
        id: excludeEventId ? { not: excludeEventId } : undefined,
        seriesId: excludeSeriesId ? { not: excludeSeriesId } : undefined,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (eventClash) return "another event is scheduled in this room";

    const bookingClash = await prisma.roomBooking.findFirst({
      where: { roomId, status: "CONFIRMED", startTime: { lt: endAt }, endTime: { gt: startAt } },
      select: { id: true },
    });
    if (bookingClash) return "the room is already booked";
  }

  return null;
}

export type ResolvedInvitee = { email: string; name: string; userId: string | null };

/**
 * Create the given occurrence slots as Event rows (sharing `seriesId`), each
 * carrying the common `base` fields and a copy of `invitees`. Runs inside a
 * caller-provided transaction. Returns the first occurrence's id. Shared by the
 * create flow and the recurrence-pattern regeneration flow.
 */
export async function materializeOccurrences(
  tx: Prisma.TransactionClient,
  opts: {
    slots: { startAt: Date; endAt: Date }[];
    seriesId: string | null;
    base: Record<string, unknown>;
    invitees: ResolvedInvitee[];
  },
): Promise<string> {
  let firstId = "";
  for (const slot of opts.slots) {
    const ev = await tx.event.create({
      data: {
        ...opts.base,
        startAt: slot.startAt,
        endAt: slot.endAt,
        seriesId: opts.seriesId,
      } as Prisma.EventUncheckedCreateInput,
    });
    if (!firstId) firstId = ev.id;
    if (opts.invitees.length) {
      await tx.eventAttendee.createMany({
        data: opts.invitees.map((r) =>
          r.userId
            ? { eventId: ev.id, userId: r.userId, status: "INVITED" as const }
            : { eventId: ev.id, externalEmail: r.email, externalName: r.name, status: "INVITED" as const },
        ),
        skipDuplicates: true,
      });
    }
  }
  return firstId;
}
