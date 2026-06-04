"use server";

import { requireStaffRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function updateEvent(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireStaffRole();
    const eventId = formData.get("eventId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const startAt = new Date(formData.get("startAt") as string);
    const endAt = new Date(formData.get("endAt") as string);
    const venueName = formData.get("venueName") as string;
    const venueLat = formData.get("venueLat") ? parseFloat(formData.get("venueLat") as string) : null;
    const venueLng = formData.get("venueLng") ? parseFloat(formData.get("venueLng") as string) : null;
    const geofenceRadius = parseInt(formData.get("geofenceRadius") as string) || 50;
    const type = formData.get("type") as string;
    const classification = formData.get("classification") as string;

    if (!eventId || !title) {
      return { error: "Event ID and title are required" };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });

    if (!event || event.organizerId !== user.id) {
      return { error: "You do not have permission to edit this event" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description,
        startAt,
        endAt,
        venueName,
        venueLat,
        venueLng,
        geofenceRadius,
        type: type as any,
        classification: classification as any,
      },
    });

    await audit({
      actorId: user.id,
      action: "UPDATE_EVENT",
      entityType: "Event",
      entityId: eventId,
      metadata: { title },
    });

    return { ok: true };
  } catch (err) {
    console.error("Failed to update event:", err);
    return { error: "Failed to update event" };
  }
}
