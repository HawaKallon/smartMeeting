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
    const roomId = (formData.get("roomId") as string) || null;
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

    if (endAt <= startAt) {
      return { error: "End time must be after start time" };
    }

    // Check room availability if room selected
    let room = null;
    if (roomId) {
      const roomConflict = await prisma.roomBooking.findFirst({
        where: {
          roomId,
          status: "CONFIRMED",
          OR: [
            {
              startTime: { lt: endAt },
              endTime: { gt: startAt },
            },
          ],
        },
      });

      if (roomConflict) {
        return { error: "Selected room is already booked for this time." };
      }

      // Fetch room to copy coordinates.
      room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { latitude: true, longitude: true },
      });
    }

    // Copy room coordinates to event if room has them.
    const updateData: any = {
      title,
      description,
      startAt,
      endAt,
      roomId,
      type: type as any,
      classification: classification as any,
    };
    if (room?.latitude != null && room?.longitude != null) {
      updateData.venueLat = room.latitude;
      updateData.venueLng = room.longitude;
    }

    await prisma.event.update({
      where: { id: eventId },
      data: updateData,
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
