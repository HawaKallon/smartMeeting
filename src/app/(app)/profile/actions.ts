"use server";

import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
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

    const updateData: { name: string; phone: string | null; image?: string; passwordHash?: string } = {
      name: name.trim(),
      phone: phone ? phone.trim() : null,
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
      const ext = path.extname(imageFile.name).toLowerCase();
      if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
        return { error: "Only PNG, JPG, JPEG, and WebP images are allowed" };
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return { error: "Image must be smaller than 5MB" };
      }

      await mkdir(UPLOAD_DIR, { recursive: true });
      const storedName = `${randomUUID()}${ext}`;
      const fullPath = path.join(UPLOAD_DIR, storedName);
      const bytes = Buffer.from(await imageFile.arrayBuffer());
      await writeFile(fullPath, bytes);

      updateData.image = `/uploads/${storedName}`;
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
