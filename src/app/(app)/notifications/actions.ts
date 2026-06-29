"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export async function markRead(notificationId: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    // Verify the notification belongs to the user
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    if (!notif) return { error: "Notification not found" };
    if (notif.userId !== user.id) return { error: "Cannot mark other users' notifications" };

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    revalidatePath("/notifications");
    return { ok: true };
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    return { error: "Failed to update notification" };
  }
}

export async function markAllRead(): Promise<void> {
  try {
    const user = await requireUser();

    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    revalidatePath("/notifications");
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
  }
}
