"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export async function updateProfile(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const name = formData.get("name") as string;

    if (!name || name.trim() === "") {
      return { error: "Name cannot be empty" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name: name.trim() },
    });

    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update profile:", err);
    return { error: "Failed to update profile" };
  }
}
