import type { MinistryRole } from "@/generated/prisma/enums";

// PRD §7 — ministry role hierarchy and permission helpers.

export const MINISTRY_ROLES = [
  "MINISTER",
  "PERMANENT_SECRETARY",
  "DEPUTY_MINISTER",
  "DEPUTY_SECRETARY",
  "ADMIN",
] as const;

export const ROLE_LABELS: Record<MinistryRole, string> = {
  MINISTER: "Minister",
  PERMANENT_SECRETARY: "Permanent Secretary",
  DEPUTY_MINISTER: "Deputy Minister",
  DEPUTY_SECRETARY: "Deputy Secretary",
  ADMIN: "Admin",
};

/** Roles that can create/manage events, letters, users, attendance (PRD §7 Admin). */
export function canManageEvents(role: MinistryRole | undefined): boolean {
  return role === "ADMIN";
}

/** Roles that can approve/route minutes (PRD §7 PS, DS). */
export function canApproveMinutes(role: MinistryRole | undefined): boolean {
  return role === "PERMANENT_SECRETARY" || role === "DEPUTY_SECRETARY";
}

/** Roles that may view ministry-wide schedule (everyone except own-only roles). */
export function canViewMinistrySchedule(role: MinistryRole | undefined): boolean {
  return (
    role === "MINISTER" ||
    role === "PERMANENT_SECRETARY" ||
    role === "DEPUTY_SECRETARY" ||
    role === "ADMIN"
  );
}

/** Every authenticated ministry user can confirm/check in to attendance. */
export function canCheckIn(role: MinistryRole | undefined): boolean {
  return role !== undefined;
}
