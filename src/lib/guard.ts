import { redirect } from "next/navigation";
import { auth } from "@/auth";
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
