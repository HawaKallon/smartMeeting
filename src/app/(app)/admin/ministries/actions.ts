"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const MinistrySchema = z.object({
  name: z.string().min(2, "Ministry name is required").max(100),
  code: z.string().min(2, "Code is required").max(10).toUpperCase(),
});

export async function createMinistry(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (!isSuperAdmin(user.role)) {
      return { error: "Only super-admins can create ministries" };
    }

    const parsed = MinistrySchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, code } = parsed.data;

    // Check if code already exists
    const existing = await prisma.ministry.findUnique({
      where: { code },
    });

    if (existing) {
      return { error: `Ministry code "${code}" already exists` };
    }

    // Create ministry
    const ministry = await prisma.ministry.create({
      data: { name, code },
    });

    // Audit log
    await audit({
      actorId: user.id,
      action: "CREATE_MINISTRY",
      entityType: "Ministry",
      entityId: ministry.id,
      metadata: { name, code },
    });

    revalidatePath("/admin/ministries");
    return { ok: true };
  } catch (err) {
    console.error("Failed to create ministry:", err);
    return { error: "Failed to create ministry" };
  }
}

export async function toggleMinistryActive(
  ministryId: string,
  newActive: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (!isSuperAdmin(user.role)) {
      return { error: "Only super-admins can manage ministries" };
    }

    const ministry = await prisma.ministry.update({
      where: { id: ministryId },
      data: { active: newActive },
    });

    // Audit log
    await audit({
      actorId: user.id,
      action: newActive ? "ACTIVATE_MINISTRY" : "DEACTIVATE_MINISTRY",
      entityType: "Ministry",
      entityId: ministryId,
      metadata: { name: ministry.name },
    });

    revalidatePath("/admin/ministries");
    return { ok: true };
  } catch (err) {
    console.error("Failed to toggle ministry:", err);
    return { error: "Failed to update ministry" };
  }
}
