import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// PRD §6.1 — dynamic / rotating QR tokens for check-in.
// A token is single-meeting, time-boxed, and replaced periodically so a
// screenshotted code stops working (anti-proxy).

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Check-in closes once the meeting's end time has passed. Used to gate both the
 * public QR/geo flow and the staff manual check-in so no attendance can be
 * recorded for a meeting that is already over.
 */
export function checkInClosed(endAt: Date): boolean {
  return endAt.getTime() < Date.now();
}

/**
 * Return a currently-valid token for the event, minting (and pruning) as needed.
 * Called by the admin QR display, which polls so the code rotates.
 */
export async function getActiveToken(eventId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const now = new Date();

  const existing = await prisma.qRToken.findFirst({
    where: { eventId, expiresAt: { gt: new Date(now.getTime() + 30_000) } },
    orderBy: { expiresAt: "desc" },
  });
  if (existing) return { token: existing.token, expiresAt: existing.expiresAt };

  const token = newToken();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  await prisma.qRToken.create({ data: { eventId, token, expiresAt } });

  // Best-effort cleanup of expired tokens for this event.
  await prisma.qRToken.deleteMany({
    where: { eventId, expiresAt: { lt: now } },
  });

  return { token, expiresAt };
}

/** Resolve a token to its event, or null if missing/expired. */
export async function resolveToken(token: string) {
  const row = await prisma.qRToken.findUnique({
    where: { token },
    include: {
      event: {
        include: {
          ministry: { select: { compoundMaxGpsAccuracy: true } },
        },
      },
    },
  });
  if (!row) return null;
  if (row.expiresAt < new Date()) return { event: row.event, expired: true as const };
  return { event: row.event, expired: false as const };
}
