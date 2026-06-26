"use server";

import { requireUser } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { provisionUser, regenerateTempPassword } from "@/lib/provisionUser";
import { isGovEmail, emailDomainOf, GOV_EMAIL_ERROR } from "@/lib/govEmail";
import { MINISTRY_ROLES } from "@/lib/roles";
import type { MinistryRole } from "@/generated/prisma/enums";

/**
 * Authorize the current user to manage `userId`, returning both records.
 * ADMINs may only manage users in their own ministry; super-admins manage all.
 * SUPER_ADMIN targets are never manageable from this surface.
 */
async function authorizeManageUser(userId: string) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
    return { error: "You do not have permission to manage users" as string };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, ministryId: true, active: true },
  });
  if (!target) return { error: "User not found" };
  if (target.role === "SUPER_ADMIN") return { error: "Super Admin accounts cannot be managed here" };

  if (user.role === "ADMIN" && user.ministryId !== target.ministryId) {
    return { error: "You can only manage users from your own ministry" };
  }

  return { user, target };
}

export async function createUser(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; emailSent?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    // Only ADMIN or SUPER_ADMIN can create users
    if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
      return { error: "You do not have permission to create users" };
    }

    const name = formData.get("name") as string;
    // Normalize to match how auth.ts looks users up at login (lowercase + trim).
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    const role = formData.get("role") as string;
    const ministryIdParam = formData.get("ministryId") as string;

    if (!name || !email || !role) {
      return { error: "All fields are required" };
    }

    // Super-admins are platform accounts and are never created from this form.
    if (role === "SUPER_ADMIN") {
      return { error: "Super Admin accounts cannot be created here" };
    }

    // Super-admin can choose any ministry; regular admins use their own
    let targetMinistryId = ministryIdParam;
    if (!isSuperAdmin(user.role)) {
      if (!user.ministryId) {
        return { error: "Cannot create users without a ministry context" };
      }
      targetMinistryId = user.ministryId;
    } else if (!targetMinistryId) {
      return { error: "Ministry is required" };
    }

    // Platform access is government-only — reject non-.gov.sl emails.
    if (!isGovEmail(email)) {
      return { error: GOV_EMAIL_ERROR };
    }

    // The new user's email domain must match their ministry's domain, otherwise
    // they could never log in (login resolves ministry from the email domain).
    const targetMinistry = await prisma.ministry.findUnique({
      where: { id: targetMinistryId },
      select: { emailDomain: true },
    });
    if (!targetMinistry) {
      return { error: "Ministry not found" };
    }
    if (targetMinistry.emailDomain && emailDomainOf(email) !== targetMinistry.emailDomain) {
      return { error: `Email must end in @${targetMinistry.emailDomain}` };
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { error: "User with this email already exists" };
    }

    // Provision the user with a temp password + welcome email (PRD §6.1).
    const { user: newUser, emailSent } = await provisionUser({
      name,
      email,
      role: role as MinistryRole,
      ministryId: targetMinistryId,
    });

    // Audit log
    await audit({
      actorId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: newUser.id,
      metadata: { name, email, role, emailSent },
      ministryId: user.ministryId,
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

    // Only ADMIN or SUPER_ADMIN can delete users
    if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
      return { error: "You do not have permission to delete users" };
    }

    // Prevent self-deletion
    if (user.id === userId) {
      return { error: "You cannot delete your own account" };
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, ministryId: true },
    });

    if (!userToDelete) {
      return { error: "User not found" };
    }

    // Regular admins can only delete users from their own ministry
    if (user.role === "ADMIN" && user.ministryId !== userToDelete.ministryId) {
      return { error: "You can only delete users from your own ministry" };
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
      ministryId: user.ministryId,
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    console.error("Failed to delete user:", err);
    return { error: "Failed to delete user" };
  }
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const auth = await authorizeManageUser(userId);
    if ("error" in auth) return { error: auth.error };
    const { user, target } = auth;

    // Only assignable ministry roles — never grant SUPER_ADMIN here.
    if (!MINISTRY_ROLES.includes(role as MinistryRole) || role === "SUPER_ADMIN") {
      return { error: "Invalid role" };
    }
    if (role === target.role) return { ok: true };

    await prisma.user.update({ where: { id: userId }, data: { role: role as MinistryRole } });

    await audit({
      actorId: user.id,
      action: "UPDATE_USER_ROLE",
      entityType: "User",
      entityId: userId,
      metadata: { email: target.email, from: target.role, to: role },
      ministryId: target.ministryId,
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update user role:", err);
    return { error: "Failed to update user role" };
  }
}

export async function setUserActive(
  userId: string,
  active: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const auth = await authorizeManageUser(userId);
    if ("error" in auth) return { error: auth.error };
    const { user, target } = auth;

    if (user.id === userId) {
      return { error: "You cannot deactivate your own account" };
    }

    await prisma.user.update({ where: { id: userId }, data: { active } });

    await audit({
      actorId: user.id,
      action: active ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entityType: "User",
      entityId: userId,
      metadata: { email: target.email, name: target.name },
      ministryId: target.ministryId,
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update user status:", err);
    return { error: "Failed to update user status" };
  }
}

/** Reset password / resend invite — both issue a fresh temp password + email it. */
async function reissueCredentials(userId: string, action: "RESET_PASSWORD" | "RESEND_INVITE") {
  const auth = await authorizeManageUser(userId);
  if ("error" in auth) return { error: auth.error };
  const { user, target } = auth;

  const { emailSent } = await regenerateTempPassword(userId);

  await audit({
    actorId: user.id,
    action,
    entityType: "User",
    entityId: userId,
    metadata: { email: target.email, emailSent },
    ministryId: target.ministryId,
  });

  revalidatePath("/admin/users");
  return { ok: true as const, emailSent };
}

export async function resetUserPassword(
  userId: string,
): Promise<{ ok?: boolean; emailSent?: boolean; error?: string }> {
  try {
    return await reissueCredentials(userId, "RESET_PASSWORD");
  } catch (err) {
    console.error("Failed to reset password:", err);
    return { error: "Failed to reset password" };
  }
}

export async function resendInvite(
  userId: string,
): Promise<{ ok?: boolean; emailSent?: boolean; error?: string }> {
  try {
    return await reissueCredentials(userId, "RESEND_INVITE");
  } catch (err) {
    console.error("Failed to resend invite:", err);
    return { error: "Failed to resend invite" };
  }
}
