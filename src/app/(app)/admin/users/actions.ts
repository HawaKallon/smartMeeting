"use server";

import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { MinistryRole } from "@/generated/prisma/enums";

// Generates a readable temporary password for first-time login (PRD §6.1).
function generateTempPassword(): string {
  // 12 url-safe chars, then strip ambiguous separators.
  return randomBytes(12).toString("base64url").replace(/[-_]/g, "").slice(0, 12);
}

export async function createUser(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; emailSent?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    // Only ADMIN can create users
    if (user.role !== "ADMIN") {
      return { error: "You do not have permission to create users" };
    }

    const name = formData.get("name") as string;
    // Normalize to match how auth.ts looks users up at login (lowercase + trim).
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    const role = formData.get("role") as string;

    if (!name || !email || !role) {
      return { error: "All fields are required" };
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { error: "User with this email already exists" };
    }

    // Issue a temporary password so the user can log in on first use (PRD §6.1).
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role as MinistryRole,
        passwordHash,
      },
    });

    // Send welcome email (with temp password) via the shared, verified-domain sender
    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
    const emailSent = await sendWelcomeEmail({ to: email, toName: name, loginUrl, tempPassword });

    // Audit log
    await audit({
      actorId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: newUser.id,
      metadata: { name, email, role, emailSent },
    });

    revalidatePath("/admin/users");
    return { ok: true, emailSent };
  } catch (err) {
    console.error("Failed to create user:", err);
    return { error: "Failed to create user" };
  }
}

export async function deleteUser(userId: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    // Only ADMIN can delete users
    if (user.role !== "ADMIN") {
      return { error: "You do not have permission to delete users" };
    }

    // Prevent self-deletion
    if (user.id === userId) {
      return { error: "You cannot delete your own account" };
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!userToDelete) {
      return { error: "User not found" };
    }

    // Delete user (will cascade delete related records due to onDelete: Cascade)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Audit log
    await audit({
      actorId: user.id,
      action: "DELETE_USER",
      entityType: "User",
      entityId: userId,
      metadata: { email: userToDelete.email, name: userToDelete.name },
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    console.error("Failed to delete user:", err);
    return { error: "Failed to delete user" };
  }
}
