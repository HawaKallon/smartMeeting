"use server";

import { z } from "zod";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canManageExistingEvent } from "@/lib/eventAccess";
import { checkInClosed, getActiveToken, setCheckInLocation } from "@/lib/checkin";

const GenerateQrSchema = z.object({
  eventId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type GenerateQrResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: string };

export async function generateCheckInQr(formData: FormData): Promise<GenerateQrResult> {
  const parsed = GenerateQrSchema.safeParse({
    eventId: formData.get("eventId"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid geolocation data." };
  }
  const { eventId, lat, lng } = parsed.data;

  const user = await requireUser();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      endAt: true,
      ministryId: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
    },
  });

  if (!event) {
    return { ok: false, error: "Event not found." };
  }

  if (!canManageExistingEvent(user, event)) {
    return { ok: false, error: "You do not have permission to generate a QR code for this event." };
  }

  if (checkInClosed(event.endAt)) {
    return { ok: false, error: "This meeting has ended. You cannot generate a new QR code." };
  }

  await setCheckInLocation(eventId, lat, lng);
  const { token, expiresAt } = await getActiveToken(eventId);

  await audit({
    actorId: user.id,
    action: "GENERATE_CHECKIN_QR",
    entityType: "Event",
    entityId: eventId,
    metadata: { lat, lng },
    ministryId: event.ministryId,
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/administrative/events/${eventId}/checkin-code`);

  return { ok: true, token, expiresAt };
}
