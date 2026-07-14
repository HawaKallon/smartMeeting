import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/roles";
import type { SystemRole } from "@/generated/prisma/enums";

// PRD §7 — server-side authorization guards for pages and server actions.

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/administrative/login");
  return session.user;
}

export async function requireRole(...roles: SystemRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.systemRole)) redirect("/administrative/forbidden");
  return user;
}

/** Throwing variant for use inside server actions / route handlers. */
export async function assertRole(...roles: SystemRole[]) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (!roles.includes(session.user.systemRole)) throw new Error("FORBIDDEN");
  return session.user;
}

/** Page guard: operational staff (EVENT_MANAGER, EXECUTIVE_ASSISTANT, MINISTRY_ADMIN, SUPER_ADMIN). */
export async function requireStaffRole() {
  return requireRole("EVENT_MANAGER", "EXECUTIVE_ASSISTANT", "MINISTRY_ADMIN", "SUPER_ADMIN");
}

/** Action guard: operational staff (EVENT_MANAGER, EXECUTIVE_ASSISTANT, MINISTRY_ADMIN, SUPER_ADMIN). */
export async function assertStaffRole() {
  return assertRole("EVENT_MANAGER", "EXECUTIVE_ASSISTANT", "MINISTRY_ADMIN", "SUPER_ADMIN");
}

/** Page guard: platform super-admin only. */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user.systemRole)) redirect("/administrative/forbidden");
  return user;
}

/** Action guard: platform super-admin only. */
export async function assertSuperAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (!isSuperAdmin(session.user.systemRole)) throw new Error("FORBIDDEN");
  return session.user;
}

/** Page guard: ministry admin or super-admin. */
export async function requireAdminRole() {
  return requireRole("MINISTRY_ADMIN", "SUPER_ADMIN");
}

/** Action guard: ministry admin or super-admin. */
export async function assertAdminRole() {
  return assertRole("MINISTRY_ADMIN", "SUPER_ADMIN");
}

/** Scope helper: returns where clause for ministry filtering. Super-admins bypass filtering. */
export function ministryScope(
  user: { systemRole: SystemRole; ministryId: string | null },
): Record<string, never> | { ministryId: string } {
  if (isSuperAdmin(user.systemRole)) return {};
  if (!user.ministryId) throw new Error("FORBIDDEN");
  return { ministryId: user.ministryId };
}

/** Assert that an entity belongs to the user's ministry (or allow super-admin). */
export function assertSameMinistry(
  user: { systemRole: SystemRole; ministryId: string | null },
  entityMinistryId: string | null
) {
  if (isSuperAdmin(user.systemRole)) return;
  if (user.ministryId !== entityMinistryId) throw new Error("FORBIDDEN");
}
