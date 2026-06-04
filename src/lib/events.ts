import { prisma } from "@/lib/prisma";

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
