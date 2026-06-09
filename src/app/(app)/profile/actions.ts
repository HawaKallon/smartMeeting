"use server";

import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
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
    const imageFile = formData.get("image") as File | null;

    if (!name || name.trim() === "") {
      return { error: "Name cannot be empty" };
    }

    const updateData: { name: string; image?: string } = { name: name.trim() };

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

    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update profile:", err);
    return { error: "Failed to update profile" };
  }
}
