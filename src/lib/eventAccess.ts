import { canApproveMinutes, canManageEvent, canReassignEvent, isSuperAdmin } from "@/lib/roles";
import type { MinistryRole } from "@/generated/prisma/enums";

type EventAccessUser = {
  id: string;
  role: MinistryRole;
  ministryId: string | null;
};

type EventAccessRecord = {
  ministryId: string;
  organizerId: string;
  coOrganizers: Array<{ id: string }>;
};

export function canAccessMinistryEvent(
  user: EventAccessUser,
  eventMinistryId: string,
) {
  return isSuperAdmin(user.role) || user.ministryId === eventMinistryId;
}

export function canManageExistingEvent(
  user: EventAccessUser,
  event: EventAccessRecord,
) {
  return canManageEvent(user, {
    ministryId: event.ministryId,
    organizerId: event.organizerId,
    coOrganizerIds: event.coOrganizers.map((coOrganizer) => coOrganizer.id),
  });
}

export function canReassignExistingEvent(
  user: EventAccessUser,
  event: EventAccessRecord,
) {
  return canReassignEvent(user, {
    ministryId: event.ministryId,
    organizerId: event.organizerId,
    coOrganizerIds: event.coOrganizers.map((coOrganizer) => coOrganizer.id),
  });
}

export function canViewMinutesForEvent(
  user: EventAccessUser,
  event: EventAccessRecord,
) {
  if (canManageExistingEvent(user, event)) return true;
  return canApproveMinutes(user.role) && canAccessMinistryEvent(user, event.ministryId);
}
