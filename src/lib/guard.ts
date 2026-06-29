import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/roles";
import type { MinistryRole } from "@/generated/prisma/enums";

// PRD §7 — server-side authorization guards for pages and server actions.

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(...roles: MinistryRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

/** Throwing variant for use inside server actions / route handlers. */
export async function assertRole(...roles: MinistryRole[]) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (!roles.includes(session.user.role)) throw new Error("FORBIDDEN");
  return session.user;
}

/** Page guard: Admin Staff (ministry ops) or Admin (tech team). */
export async function requireStaffRole() {
  return requireRole("ADMIN_STAFF", "ADMIN");
}

/** Action guard: Admin Staff (ministry ops) or Admin (tech team). */
export async function assertStaffRole() {
  return assertRole("ADMIN_STAFF", "ADMIN");
}

/** Page guard: ministry admin or platform super-admin. */
export async function requireAdminRole() {
  return requireRole("ADMIN", "SUPER_ADMIN");
}

/** Action guard: ministry admin or platform super-admin. */
export async function assertAdminRole() {
  return assertRole("ADMIN", "SUPER_ADMIN");
}

/** Page guard: platform super-admin only. */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user.role)) redirect("/forbidden");
  return user;
}

/** Action guard: platform super-admin only. */
export async function assertSuperAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (!isSuperAdmin(session.user.role)) throw new Error("FORBIDDEN");
  return session.user;
}

/** Scope helper: returns where clause for ministry filtering. Super-admins bypass filtering. */
export function ministryScope(
  user: { role: MinistryRole; ministryId: string | null },
): { ministryId?: string } {
  if (isSuperAdmin(user.role)) return {};
  // A ministry-bound role without a ministry must never receive an unscoped query.
  return { ministryId: user.ministryId ?? "__missing_ministry__" };
}

/** Assert that an entity belongs to the user's ministry (or allow super-admin). */
export function assertSameMinistry(
  user: { role: MinistryRole; ministryId: string | null },
  entityMinistryId: string | null
) {
  if (isSuperAdmin(user.role)) return;
  if (user.ministryId !== entityMinistryId) throw new Error("FORBIDDEN");
}
