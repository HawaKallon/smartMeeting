import { canManageEvent, canReassignEvent, isSuperAdmin } from "@/lib/roles";
import type { SystemRole } from "@/generated/prisma/enums";

type EventAccessUser = {
  id: string;
  systemRole: SystemRole;
  ministryId: string | null;
};

type EventAccessRecord = {
  ministryId: string;
  organizerId: string | null;
  coOrganizers: Array<{ id: string }>;
};

export function canAccessMinistryEvent(
  user: EventAccessUser,
  eventMinistryId: string,
) {
  return isSuperAdmin(user.systemRole) || user.ministryId === eventMinistryId;
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
  return canManageExistingEvent(user, event);
}
