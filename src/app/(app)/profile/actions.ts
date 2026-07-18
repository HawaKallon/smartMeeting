"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { saveImage } from "@/lib/cloudinary";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

export async function updateProfile(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const name = formData.get("name") as string;
    const phone = (formData.get("phone") as string) || null;
    const imageFile = formData.get("image") as File | null;
    const currentPassword = (formData.get("currentPassword") as string) || "";
    const newPassword = (formData.get("newPassword") as string) || "";

    if (!name || name.trim() === "") {
      return { error: "Name cannot be empty" };
    }

    const updateData: {
      name: string;
      phone: string | null;
      image?: string;
      passwordHash?: string;
      emailNotifications?: boolean;
      minutesNotifications?: boolean;
      actionItemNotifications?: boolean;
    } = {
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      emailNotifications: formData.get("emailNotifications") === "on",
      minutesNotifications: formData.get("minutesNotifications") === "on",
      actionItemNotifications: formData.get("actionItemNotifications") === "on",
    };

    // Optional password change — only when a new password is supplied.
    if (newPassword) {
      if (newPassword.length < 8) {
        return { error: "New password must be at least 8 characters" };
      }
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      // If the user already has a password, the current one must match.
      if (dbUser?.passwordHash) {
        if (!currentPassword) {
          return { error: "Enter your current password to set a new one" };
        }
        const ok = await bcrypt.compare(currentPassword, dbUser.passwordHash);
        if (!ok) {
          return { error: "Current password is incorrect" };
        }
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (imageFile && imageFile.size > 0) {
      const ext = "." + imageFile.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
        return { error: "Only PNG, JPG, JPEG, and WebP images are allowed" };
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return { error: "Image must be smaller than 5MB" };
      }

      try {
        updateData.image = await saveImage(imageFile, "user-avatars");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload image";
        return { error: message };
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    revalidatePath("/administrative/profile");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update profile:", err);
    return { error: "Failed to update profile" };
  }
}
