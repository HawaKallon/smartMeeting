"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export async function updateAllSettings(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const emailNotifications = formData.get("emailNotifications") === "on";
    const meetingReminders = formData.get("meetingReminders") === "on";
    const actionItemNotifications = formData.get("actionItemNotifications") === "on";
    const theme = (formData.get("theme") as string) || "dark";
    const compactMode = formData.get("compactMode") === "on";
    const sessionTimeout = parseInt(formData.get("sessionTimeout") as string) || 30;
    const autoDeleteRecordings = formData.get("autoDeleteRecordings") === "on";

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailNotifications,
        meetingReminders,
        actionItemNotifications,
        theme,
        compactMode,
        sessionTimeout,
        autoDeleteRecordings,
      },
    });

    revalidatePath("/administrative/settings");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update settings:", err);
    return { error: "Failed to update settings" };
  }
}
