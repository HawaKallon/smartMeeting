import type { SystemRole } from "@/generated/prisma/enums";

// PRD §7 — system role hierarchy and permission helpers (P2: refactored to use systemRole).

export const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "MINISTER",
  "MINISTRY_ADMIN",
  "STAFF",
] as const;

export const ASSIGNABLE_SYSTEM_ROLES = SYSTEM_ROLES.filter((r) => r !== "SUPER_ADMIN");

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MINISTER: "Minister",
  MINISTRY_ADMIN: "Ministry Admin",
  STAFF: "Staff",
};

/** Can administer the ministry (users, rooms, ministry settings). */
export function isMinistryAdminLevel(role: SystemRole | undefined): boolean {
  return role === "MINISTRY_ADMIN" || role === "MINISTER";
}

/**
 * Operational staff: create/manage events, letters, attendance, draft minutes.
 * Includes STAFF, LEADERSHIP, MINISTRY_ADMIN, and SUPER_ADMIN.
 */
export function canManageEvents(role: SystemRole | undefined): boolean {
  return (
    isSuperAdmin(role) ||
    isMinistryAdminLevel(role) ||
    role === "STAFF"
  );
}


/** Every defined role can view ministry-wide schedule. */
export function canViewMinistrySchedule(role: SystemRole | undefined): boolean {
  return role !== undefined;
}

/** Every authenticated ministry user can confirm/check in to attendance. */
export function canCheckIn(role: SystemRole | undefined): boolean {
  return role !== undefined;
}

/** Super-admin (platform-wide admin). */
export function isSuperAdmin(role: SystemRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

// Per-event permissions: the organizer, their co-organizers, and ministry ADMINs
// may manage a given event; only the organizer or a ministry ADMIN may reassign it.

export type EventPerm = { ministryId: string; organizerId: string; coOrganizerIds: string[] };
export type ActorPerm = { id: string; systemRole: SystemRole; ministryId: string | null };

/** Can this actor edit/cancel/manage the given event? */
export function canManageEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.systemRole)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  return (
    e.organizerId === actor.id ||
    e.coOrganizerIds.includes(actor.id) ||
    isMinistryAdminLevel(actor.systemRole)
  );
}

/** Can this actor add/remove co-organizers (reassign) on the given event? */
export function canReassignEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.systemRole)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  return e.organizerId === actor.id || isMinistryAdminLevel(actor.systemRole);
}

