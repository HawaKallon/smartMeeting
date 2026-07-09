"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertSameMinistry } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function createRoom(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
      return { error: "Forbidden" };
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

    const latitude = formData.get("latitude") as string;
    const longitude = formData.get("longitude") as string;

    let ministryId: string;
    if (isSuperAdmin(user.role)) {
      ministryId = formData.get("ministryId") as string;
      if (!ministryId) {
        return { error: "Ministry is required" };
      }
      const ministry = await prisma.ministry.findUnique({ where: { id: ministryId } });
      if (!ministry) {
        return { error: "Invalid ministry" };
      }
    } else {
      if (!user.ministryId) {
        return { error: "Cannot create rooms without a ministry context" };
      }
      ministryId = user.ministryId;
    }

    const room = await prisma.room.create({
      data: {
        ministryId,
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
      ministryId,
    });

    revalidatePath("/administrative/rooms");
    revalidatePath("/administrative/admin/rooms");
    return { ok: true };
  } catch (err) {
    console.error("Failed to create room:", err);
    return { error: "Failed to create room" };
  }
}

export async function updateRoom(
  roomId: string,
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
      return { error: "Forbidden" };
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, ministryId: true },
    });

    if (!room) {
      return { error: "Room not found" };
    }

    assertSameMinistry(user, room.ministryId);

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

    await prisma.room.update({
      where: { id: roomId },
      data: {
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
      action: "UPDATE_ROOM",
      entityType: "Room",
      entityId: roomId,
      metadata: { name, location, capacity },
      ministryId: room.ministryId,
    });

    revalidatePath("/administrative/rooms");
    revalidatePath("/administrative/admin/rooms");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update room:", err);
    return { error: "Failed to update room" };
  }
}

export async function deleteRoom(roomId: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
      return { error: "Forbidden" };
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, ministryId: true },
    });

    if (!room) {
      return { error: "Room not found" };
    }

    assertSameMinistry(user, room.ministryId);

    await prisma.room.delete({ where: { id: roomId } });

    await audit({
      actorId: user.id,
      action: "DELETE_ROOM",
      entityType: "Room",
      entityId: roomId,
      ministryId: room.ministryId,
    });

    revalidatePath("/administrative/rooms");
    revalidatePath("/administrative/admin/rooms");
    return { ok: true };
  } catch (err) {
    console.error("Failed to delete room:", err);
    return { error: "Failed to delete room" };
  }
}
