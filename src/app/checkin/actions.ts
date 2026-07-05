"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { audit } from "@/lib/audit";
import { resolveToken, checkInClosed } from "@/lib/checkin";
import { withinGeofence } from "@/lib/geo";

const CheckInSchema = z.object({
  token: z.string().min(1),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  accuracy: z.coerce.number().optional(),
  mock: z.coerce.boolean().optional(),
});

export type CheckInResult =
  | { ok: true; already?: boolean; withinGeofence: boolean | null; eventTitle: string }
  | { ok: false; error: string };

export async function submitCheckIn(formData: FormData): Promise<CheckInResult> {
  const parsed = CheckInSchema.safeParse({
    token: formData.get("token"),
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    accuracy: formData.get("accuracy") || undefined,
    mock: formData.get("mock") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid check-in data." };
  const data = parsed.data;

  const resolved = await resolveToken(data.token);
  if (!resolved) return { ok: false, error: "Invalid check-in code." };
  if (resolved.expired)
    return { ok: false, error: "This check-in code has expired. Ask for a fresh code." };

  const event = resolved.event;

  // Check-in closes once the meeting has ended (PRD §6 — no late attendance).
  if (checkInClosed(event.endAt)) {
    return { ok: false, error: "This meeting has ended. Check-in is closed." };
  }

  // Require login and verify the user is on the invite list.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Please sign in to check in." };
  }

  const invite = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
  });
  if (!invite) {
    return { ok: false, error: "You are not on the invite list for this meeting." };
  }

  // Geofence verdict (PRD §6.6). When the event has venue coordinates configured
  // (geofenced), on-site verification is MANDATORY — we must not trust the client to
  // send coordinates. A crafted request that omits lat/lng, or reports a spoofed
  // (mock) location, is rejected rather than silently recorded as a plain QR check-in.
  const hasGeofence = event.venueLat != null && event.venueLng != null;
  let within: boolean | null = null;
  if (hasGeofence) {
    if (data.lat == null || data.lng == null) {
      return {
        ok: false,
        error: "Location is required to check in to this meeting. Enable GPS and try again.",
      };
    }
    if (data.mock === true) {
      return {
        ok: false,
        error: "Your location could not be trusted. Turn off mock locations and try again with GPS on.",
      };
    }
    within = withinGeofence(
      { lat: data.lat, lng: data.lng },
      { lat: event.venueLat!, lng: event.venueLng!, radius: event.geofenceRadius },
    );
    if (!within) {
      return {
        ok: false,
        error: "You are outside the meeting venue. Check-in requires you to be on-site.",
      };
    }
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  // Prevent duplicate check-ins for logged-in users.
  if (userId) {
    const existing = await prisma.attendance.findFirst({
      where: { eventId: event.id, userId },
    });
    if (existing) {
      return { ok: true, already: true, withinGeofence: existing.withinGeofence, eventTitle: event.title };
    }
  }

  let attendance;
  try {
    attendance = await prisma.attendance.create({
      data: {
        eventId: event.id,
        userId,
        method: data.lat != null ? "GEO" : "QR",
        lat: data.lat,
        lng: data.lng,
        gpsAccuracy: data.accuracy,
        withinGeofence: within,
        mockLocationFlag: data.mock ?? false,
        ipAddress: ip,
      },
    });
  } catch (err) {
    // Unique (eventId, userId): a concurrent check-in already inserted a row for
    // this user. Treat the loser of the race as an already-checked-in success.
    if ((err as { code?: string }).code === "P2002") {
      const existing = await prisma.attendance.findFirst({ where: { eventId: event.id, userId } });
      return { ok: true, already: true, withinGeofence: existing?.withinGeofence ?? null, eventTitle: event.title };
    }
    throw err;
  }

  await audit({
    actorId: userId,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: attendance.id,
    metadata: { eventId: event.id, method: attendance.method, withinGeofence: within },
    ministryId: event.ministryId,
  });

  // Revalidate event pages so attendee list and counts reflect the check-in.
  // NOTE: keep this in sync with the manual check-in action — the attendance
  // page (invite dropdown + "Checked in" list) is derived from `attendances`,
  // so it must be revalidated here too or the invite list goes stale.
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/administrative/events/${event.id}/attendance`);
  revalidatePath(`/administrative/events/${event.id}/attendees`);
  revalidatePath(`/administrative/events/${event.id}`);

  return { ok: true, withinGeofence: within, eventTitle: event.title };
}
