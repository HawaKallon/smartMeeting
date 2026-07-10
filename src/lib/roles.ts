import type { SystemRole, MinistryRole } from "@/generated/prisma/enums";

// PRD §7 — system role hierarchy and permission helpers (P2: refactored to use systemRole).

export const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "MINISTRY_ADMIN",
  "EVENT_MANAGER",
  "EXECUTIVE_ASSISTANT",
  "APPROVER",
  "EXECUTIVE_VIEWER",
  "STAFF",
] as const;

export const ASSIGNABLE_SYSTEM_ROLES = SYSTEM_ROLES.filter((r) => r !== "SUPER_ADMIN");

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MINISTRY_ADMIN: "Ministry Admin",
  EVENT_MANAGER: "Event Manager",
  EXECUTIVE_ASSISTANT: "Executive Assistant",
  APPROVER: "Approver",
  EXECUTIVE_VIEWER: "Executive Viewer",
  STAFF: "Staff",
};

/**
 * Operational staff: create/manage events, letters, attendance, draft minutes.
 * Includes EVENT_MANAGER, EXECUTIVE_ASSISTANT, MINISTRY_ADMIN, and SUPER_ADMIN.
 */
export function canManageEvents(role: SystemRole | undefined): boolean {
  return (
    isSuperAdmin(role) ||
    role === "MINISTRY_ADMIN" ||
    role === "EVENT_MANAGER" ||
    role === "EXECUTIVE_ASSISTANT"
  );
}

/** Roles that can approve/publish minutes (P2: collapsed PERMANENT_SECRETARY/DEPUTY_SECRETARY into APPROVER). */
export function canApproveMinutes(role: SystemRole | undefined): boolean {
  return role === "APPROVER";
}

/** Roles that may view ministry-wide schedule (refactored for new role hierarchy). */
export function canViewMinistrySchedule(role: SystemRole | undefined): boolean {
  return (
    isSuperAdmin(role) ||
    canManageEvents(role) ||
    role === "APPROVER" ||
    role === "EXECUTIVE_VIEWER"
  );
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
export type ActorPerm = { id: string; role: SystemRole; ministryId: string | null };

/** Can this actor edit/cancel/manage the given event? */
export function canManageEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.systemRole)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  return (
    e.organizerId === actor.id ||
    e.coOrganizerIds.includes(actor.id) ||
    actor.systemRole === "MINISTRY_ADMIN"
  );
}

/** Can this actor add/remove co-organizers (reassign) on the given event? */
export function canReassignEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.systemRole)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  return e.organizerId === actor.id || actor.systemRole === "MINISTRY_ADMIN";
}

// ─────────────────────────────────────────────────────────────────
// Deprecated: MinistryRole helpers (kept for backward compat during migration)
// ─────────────────────────────────────────────────────────────────

// MinistryRole type is a union of the mapped SystemRole values.
// Keyed by the old enum keys for reference only.
export const ROLE_LABELS: Partial<Record<MinistryRole, string>> = {
  "MINISTRY_ADMIN": "Ministry Admin / Admin",
  "APPROVER": "Approver (PS/DS)",
  "EXECUTIVE_VIEWER": "Executive Viewer (Deputy Minister)",
  "EVENT_MANAGER": "Event Manager / Admin Staff",
  "STAFF": "Staff Member",
  "SUPER_ADMIN": "Super Admin",
};

export const MINISTRY_ROLES = [
  "MINISTRY_ADMIN",
  "APPROVER",
  "EXECUTIVE_VIEWER",
  "APPROVER",
  "EVENT_MANAGER",
  "MINISTRY_ADMIN",
  "SUPER_ADMIN",
  "STAFF",
] as const;

export const LEADERSHIP_ROLES = [
  "MINISTRY_ADMIN",
  "APPROVER",
  "EXECUTIVE_VIEWER",
] as const;

export function isLeadership(role: SystemRole | undefined): boolean {
  return (
    role === "MINISTRY_ADMIN" ||
    role === "APPROVER" ||
    role === "EXECUTIVE_VIEWER"
  );
}
