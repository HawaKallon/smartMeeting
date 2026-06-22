"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertStaffRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function createRoom(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await assertStaffRole();

    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const capacity = parseInt(formData.get("capacity") as string);
    const amenitiesStr = formData.get("amenities") as string;

    if (!name || !location || !capacity) {
      return { error: "All required fields must be filled" };
    }

    const amenities = amenitiesStr
      ? amenitiesStr.split(",").map((a) => a.trim())
      : [];

    const latitude = formData.get("latitude") as string;
    const longitude = formData.get("longitude") as string;

    if (!user.ministryId) {
      return { error: "Cannot create rooms without a ministry context" };
    }

    const room = await prisma.room.create({
      data: {
        ministryId: user.ministryId,
        name,
        location,
        capacity,
        amenities,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    await audit({
      actorId: user.id,
      action: "CREATE_ROOM",
      entityType: "Room",
      entityId: room.id,
      metadata: { name, location, capacity },
      ministryId: user.ministryId,
    });

    revalidatePath("/rooms");
    return { ok: true };
  } catch (err) {
    console.error("Failed to create room:", err);
    return { error: "Failed to create room" };
  }
}
