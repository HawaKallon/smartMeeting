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

export async function manualCheckIn(formData: FormData) {
  const admin = await assertStaffRole();

  const parsed = ManualSchema.safeParse({
    eventId: formData.get("eventId"),
    userId: formData.get("userId") || undefined,
    externalName: formData.get("externalName") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid input");
  const { eventId, userId, externalName } = parsed.data;

  if (!userId && !externalName) throw new Error("Select a user or enter a name");

  // Avoid duplicate manual check-ins for the same registered user.
  if (userId) {
    const existing = await prisma.attendance.findFirst({
      where: { eventId, userId },
    });
    if (existing) {
      revalidatePath(`/events/${eventId}/attendance`);
      return;
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

  revalidatePath(`/events/${eventId}/attendance`);
}
