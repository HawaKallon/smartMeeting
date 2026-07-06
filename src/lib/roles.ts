import type { MinistryRole } from "@/generated/prisma/enums";

// PRD §7 — ministry role hierarchy and permission helpers.

export const MINISTRY_ROLES = [
  "MINISTER",
  "PERMANENT_SECRETARY",
  "DEPUTY_MINISTER",
  "DEPUTY_SECRETARY",
  "ADMIN_STAFF",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export const ROLE_LABELS: Record<MinistryRole, string> = {
  MINISTER: "Minister",
  PERMANENT_SECRETARY: "Permanent Secretary",
  DEPUTY_MINISTER: "Deputy Minister",
  DEPUTY_SECRETARY: "Deputy Secretary",
  ADMIN_STAFF: "Admin Staff",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

/**
 * Operational staff: create/manage events, letters, attendance.
 * Includes both Admin Staff (ministry ops) and Admin (tech team).
 */
export function canManageEvents(role: MinistryRole | undefined): boolean {
  return isSuperAdmin(role) || role === "ADMIN_STAFF" || role === "ADMIN";
}

/** Roles that can approve/route minutes (PRD §7 PS, DS). */
export function canApproveMinutes(role: MinistryRole | undefined): boolean {
  return role === "PERMANENT_SECRETARY" || role === "DEPUTY_SECRETARY";
}

/** Roles that may view ministry-wide schedule. */
export function canViewMinistrySchedule(role: MinistryRole | undefined): boolean {
  return (
    isSuperAdmin(role) ||
    role === "MINISTER" ||
    role === "PERMANENT_SECRETARY" ||
    role === "DEPUTY_MINISTER" ||
    role === "DEPUTY_SECRETARY" ||
    role === "ADMIN_STAFF" ||
    role === "ADMIN"
  );
}

/** Every authenticated ministry user can confirm/check in to attendance. */
export function canCheckIn(role: MinistryRole | undefined): boolean {
  return role !== undefined;
}

/** Super-admin (platform-wide admin). */
export function isSuperAdmin(role: MinistryRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

// Per-event permissions: the organizer, their co-organizers, and ministry ADMINs
// may manage a given event; only the organizer or a ministry ADMIN may reassign it.

export type EventPerm = { ministryId: string; organizerId: string; coOrganizerIds: string[] };
export type ActorPerm = { id: string; role: MinistryRole; ministryId: string | null };

/** Can this actor edit/cancel/manage the given event? */
export function canManageEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.role)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  return (
    e.organizerId === actor.id ||
    e.coOrganizerIds.includes(actor.id) ||
    actor.role === "ADMIN"
  );
}

/** Can this actor add/remove co-organizers (reassign) on the given event? */
export function canReassignEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.role)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  return e.organizerId === actor.id || actor.role === "ADMIN";
}
