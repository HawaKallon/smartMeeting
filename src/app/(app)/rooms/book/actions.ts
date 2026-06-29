"use server";

import { requireUser, ministryScope } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function bookRoom(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const roomId = formData.get("roomId") as string;
    const date = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const purpose = formData.get("purpose") as string;
    const attendeeCount = parseInt(formData.get("attendeeCount") as string) || 0;
    const notes = formData.get("notes") as string;

    if (!roomId || !date || !startTime || !endTime || !purpose) {
      return { error: "All required fields must be filled" };
    }

    // Verify room exists and belongs to the user's ministry
    const room = await prisma.room.findFirst({
      where: { id: roomId, ...ministryScope(user) },
    });
    if (!room) {
      return { error: "Room not found or you don't have access" };
    }

    // Check capacity
    if (attendeeCount > room.capacity) {
      return { error: `Room capacity is ${room.capacity}, but ${attendeeCount} attendees requested` };
    }

    // Parse date and times
    const [year, month, day] = date.split("-").map(Number);
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startDateTime = new Date(year, month - 1, day, startHour, startMin);
    const endDateTime = new Date(year, month - 1, day, endHour, endMin);

    if (endDateTime <= startDateTime) {
      return { error: "End time must be after start time" };
    }

    // Check for conflicts
    const conflicts = await prisma.roomBooking.findFirst({
      where: {
        roomId,
        status: "CONFIRMED",
        OR: [
          {
            // New booking starts before existing ends
            startTime: { lt: endDateTime },
            endTime: { gt: startDateTime },
          },
        ],
      },
    });

    if (conflicts) {
      return { error: "Room is already booked for this time" };
    }

    // Create booking
    const booking = await prisma.roomBooking.create({
      data: {
        ministryId: user.ministryId!,
        roomId,
        userId: user.id,
        startTime: startDateTime,
        endTime: endDateTime,
        purpose: purpose as any,
        attendeeCount,
        notes,
        status: "CONFIRMED",
      },
    });

    // Audit log
    await audit({
      actorId: user.id,
      action: "BOOK_ROOM",
      entityType: "RoomBooking",
      entityId: booking.id,
      metadata: {
        roomId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        attendeeCount,
      },
      ministryId: user.ministryId,
    });

    revalidatePath("/administrative/rooms");
    return { ok: true };
  } catch (err) {
    console.error("Failed to book room:", err);
    return { error: "Failed to book room" };
  }
}

export async function cancelBooking(bookingId: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const booking = await prisma.roomBooking.findFirst({
      where: { id: bookingId, ...ministryScope(user) },
    });
    if (!booking) {
      return { error: "Booking not found or you don't have access" };
    }

    if (booking.userId !== user.id) {
      return { error: "You can only cancel your own bookings" };
    }

    await prisma.roomBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    await audit({
      actorId: user.id,
      action: "CANCEL_ROOM_BOOKING",
      entityType: "RoomBooking",
      entityId: bookingId,
      ministryId: user.ministryId,
    });

    revalidatePath("/administrative/rooms");
    return { ok: true };
  } catch (err) {
    console.error("Failed to cancel booking:", err);
    return { error: "Failed to cancel booking" };
  }
}
