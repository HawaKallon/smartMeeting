"use server";

import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function createRoom(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (user.role !== "ADMIN") {
      return { error: "You do not have permission to create rooms" };
    }

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

    const room = await prisma.room.create({
      data: {
        name,
        location,
        capacity,
        amenities,
      },
    });

    await audit({
      actorId: user.id,
      action: "CREATE_ROOM",
      entityType: "Room",
      entityId: room.id,
      metadata: { name, location, capacity },
    });

    return { ok: true };
  } catch (err) {
    console.error("Failed to create room:", err);
    return { error: "Failed to create room" };
  }
}
