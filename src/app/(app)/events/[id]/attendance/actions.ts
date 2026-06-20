"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaffRole } from "@/lib/guard";
import { audit } from "@/lib/audit";

const ManualSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().optional(),
  externalName: z.string().optional(),
});

export type ActionState = { ok?: true; error?: string } | undefined;

export async function manualCheckIn(
  _prev: unknown,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await assertStaffRole();

    const parsed = ManualSchema.safeParse({
      eventId: formData.get("eventId"),
      userId: formData.get("userId") || undefined,
      externalName: formData.get("externalName") || undefined,
    });
    if (!parsed.success) return { error: "Invalid input" };
    const { eventId, userId, externalName } = parsed.data;

    if (!userId && !externalName) {
      return { error: "Select a user or enter a name" };
    }

    // For registered users, verify they are invited to the event.
    if (userId) {
      const invite = await prisma.eventAttendee.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (!invite) {
        return { error: "This user is not on the invite list for this event." };
      }

      // Avoid duplicate manual check-ins for the same registered user.
      const existing = await prisma.attendance.findFirst({
        where: { eventId, userId },
      });
      if (existing) {
        revalidatePath(`/events/${eventId}/attendance`);
        return { ok: true };
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        eventId,
        userId: userId ?? null,
        externalName: userId ? null : externalName,
        method: "MANUAL",
      },
    });

    await audit({
      actorId: admin.id,
      action: "MANUAL_CHECK_IN",
      entityType: "Attendance",
      entityId: attendance.id,
      metadata: { eventId, userId, externalName },
    });

    // Revalidate all relevant pages so check-in shows everywhere.
    revalidatePath(`/events/${eventId}/attendance`);
    revalidatePath(`/events/${eventId}/attendees`);
    revalidatePath(`/events/${eventId}`);

    return { ok: true };
  } catch (err) {
    console.error("Manual check-in failed:", err);
    return { error: "Failed to check in" };
  }
}
