import type { Event, Minutes, ActionItem } from "@/generated/prisma/client";
import type { SystemRole } from "@/generated/prisma/enums";
import type { ActorPerm } from "./roles";
import { isSuperAdmin, canManageEvents, canApproveMinutes } from "./roles";
import {
  canAccessMinistryEvent,
  canManageExistingEvent,
  canReassignExistingEvent,
  canViewMinutesForEvent,
} from "./eventAccess";

// ────────────────────────────────────────────────────────────────────────────
// User-level capabilities
// ────────────────────────────────────────────────────────────────────────────

type MinimalUser = { role: SystemRole; ministryId?: string | null };

export function canCreateEvent(user: MinimalUser | null): boolean {
  if (!user) return false;
  return canManageEvents(user.systemRole);
}

export function canManageUsers(user: MinimalUser | null, targetMinistryId?: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user.systemRole)) return true;
  if (user.systemRole !== "MINISTRY_ADMIN") return false;
  if (targetMinistryId && user.ministryId !== targetMinistryId) return false;
  return true;
}

export function canManageRooms(user: MinimalUser | null, targetMinistryId?: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user.systemRole)) return true;
  if (user.systemRole !== "MINISTRY_ADMIN") return false;
  if (targetMinistryId && user.ministryId !== targetMinistryId) return false;
  return true;
}

export function canManageMinistry(user: MinimalUser | null, ministryId: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user.systemRole)) return true;
  return user.systemRole === "MINISTRY_ADMIN" && user.ministryId === ministryId;
}

// ────────────────────────────────────────────────────────────────────────────
// Event-level permissions
// ────────────────────────────────────────────────────────────────────────────

// Helper to convert Event to EventAccessRecord
function eventToAccessRecord(event: Event & { coOrganizers?: Array<{ id: string }> }) {
  return {
    ministryId: event.ministryId,
    organizerId: event.organizerId,
    coOrganizers: event.coOrganizers || [],
  };
}

export function canManageEvent(
  user: ActorPerm,
  event: Event & { coOrganizers?: Array<{ id: string }> },
): boolean {
  return canManageExistingEvent(user, eventToAccessRecord(event));
}

export function canViewEvent(user: ActorPerm, event: Event): boolean {
  return canAccessMinistryEvent(user, event.ministryId);
}

export function canEditEvent(
  user: ActorPerm,
  event: Event & { coOrganizers?: Array<{ id: string }> },
): boolean {
  return canManageExistingEvent(user, eventToAccessRecord(event));
}

export function canCancelEvent(
  user: ActorPerm,
  event: Event & { coOrganizers?: Array<{ id: string }> },
): boolean {
  return canManageExistingEvent(user, eventToAccessRecord(event));
}

export function canManageEventAttendees(
  user: ActorPerm,
  event: Event & { coOrganizers?: Array<{ id: string }> },
): boolean {
  return canManageExistingEvent(user, eventToAccessRecord(event));
}

export function canReassignEvent(
  user: ActorPerm,
  event: Event & { coOrganizers?: Array<{ id: string }> },
): boolean {
  return canReassignExistingEvent(user, eventToAccessRecord(event));
}

// ────────────────────────────────────────────────────────────────────────────
// Minutes permissions
// ────────────────────────────────────────────────────────────────────────────

export function canDraftMinutes(
  user: ActorPerm,
  event: Event & { coOrganizers?: Array<{ id: string }> },
): boolean {
  // Organizer, co-org, operational staff can draft
  return canManageExistingEvent(user, eventToAccessRecord(event));
}

export function canSubmitMinutes(
  user: ActorPerm,
  minutes: Minutes & { event: Event & { coOrganizers?: Array<{ id: string }> } },
): boolean {
  // Only the drafter or someone with edit access can submit
  // (In P3, we'll track who drafted and enforce stricter rules)
  return canDraftMinutes(user, minutes.event);
}

export function canPublishMinutes(user: ActorPerm, event: Event): boolean {
  // APPROVER role in same ministry
  return canApproveMinutes(user.systemRole) && user.ministryId === event.ministryId;
}

export function canViewMinutes(
  user: ActorPerm,
  minutes: Minutes & { event: Event & { coOrganizers?: Array<{ id: string }> } },
): boolean {
  return canViewMinutesForEvent(user, eventToAccessRecord(minutes.event));
}

// ────────────────────────────────────────────────────────────────────────────
// Action item permissions
// ────────────────────────────────────────────────────────────────────────────

export function canViewActionItem(
  user: ActorPerm,
  actionItem: ActionItem & { event: Event & { coOrganizers?: Array<{ id: string }> } },
): boolean {
  // Can view if:
  // 1. Owner (assigned to you)
  // 2. You manage the event it's for
  // 3. You're MINISTRY_ADMIN or SUPER_ADMIN in the ministry

  if (actionItem.ownerId === user.id) return true;
  if (isSuperAdmin(user.systemRole)) return true;

  const event = actionItem.event;
  if (user.systemRole === "MINISTRY_ADMIN" && user.ministryId === event.ministryId) return true;
  if (canManageExistingEvent(user, eventToAccessRecord(event))) return true;

  return false;
}

export function canUpdateActionItem(
  user: ActorPerm,
  actionItem: ActionItem & { event: Event & { coOrganizers?: Array<{ id: string }> } },
): boolean {
  // Can update if owner (assigned to you), or if you manage the event
  if (actionItem.ownerId === user.id) return true;
  return canManageExistingEvent(user, eventToAccessRecord(actionItem.event));
}
