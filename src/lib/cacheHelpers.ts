import { cache } from './cache';
import { CACHE_KEYS, CACHE_TTL } from './cacheKeys';
import { prisma } from './prisma';
import type { SystemRole } from '@/generated/prisma/enums';

// ===== PERMISSIONS & ROLES =====

export async function getUserRoleWithCache(userId: string): Promise<SystemRole | null> {
  return cache.getOrSet(
    CACHE_KEYS.USER_ROLE(userId),
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { systemRole: true },
      });
      return user?.systemRole ?? null;
    },
    { ttl: CACHE_TTL.PERMISSIONS }
  );
}

export async function invalidateUserPermissions(userId: string): Promise<void> {
  await cache.invalidate(
    CACHE_KEYS.USER_PERMISSIONS(userId),
    CACHE_KEYS.USER_ROLE(userId),
    CACHE_KEYS.USER_PROFILE(userId)
  );
}

// ===== MINISTRY LOOKUPS =====

export async function getMinistryWithCache(ministryId: string) {
  return cache.getOrSet(
    CACHE_KEYS.MINISTRY(ministryId),
    async () => {
      return prisma.ministry.findUnique({
        where: { id: ministryId },
      });
    },
    { ttl: CACHE_TTL.MINISTRIES }
  );
}

export async function getMinistryListWithCache() {
  return cache.getOrSet(
    CACHE_KEYS.MINISTRY_LIST,
    async () => {
      return prisma.ministry.findMany({
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { name: 'asc' },
      });
    },
    { ttl: CACHE_TTL.MINISTRIES }
  );
}

export async function getMinistryUsersWithCache(ministryId: string) {
  return cache.getOrSet(
    CACHE_KEYS.MINISTRY_USERS(ministryId),
    async () => {
      return prisma.user.findMany({
        where: { ministryId },
        select: {
          id: true,
          email: true,
          name: true,
          systemRole: true,
        },
        orderBy: { name: 'asc' },
      });
    },
    { ttl: CACHE_TTL.MINISTRIES }
  );
}

export async function invalidateMinistryCache(ministryId: string): Promise<void> {
  await cache.deletePattern(`ministry:*:${ministryId}*`);
  await cache.invalidate(
    CACHE_KEYS.MINISTRY(ministryId),
    CACHE_KEYS.MINISTRY_USERS(ministryId),
    CACHE_KEYS.MINISTRY_LIST
  );
}

// ===== CALENDAR & EVENTS =====

export async function getEventWithCache(eventId: string) {
  return cache.getOrSet(
    CACHE_KEYS.EVENT(eventId),
    async () => {
      return prisma.event.findUnique({
        where: { id: eventId },
        include: {
          ministry: true,
          organizer: true,
          coOrganizers: true,
          room: true,
          attendees: true,
        },
      });
    },
    { ttl: CACHE_TTL.EVENTS }
  );
}

export async function getUpcomingEventsWithCache(ministryId: string) {
  return cache.getOrSet(
    CACHE_KEYS.UPCOMING_EVENTS(ministryId),
    async () => {
      const now = new Date();
      return prisma.event.findMany({
        where: {
          ministryId,
          startAt: { gte: now },
        },
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          roomId: true,
          organizerId: true,
        },
        orderBy: { startAt: 'asc' },
        take: 10,
      });
    },
    { ttl: CACHE_TTL.EVENTS }
  );
}

export async function getEventAttendeesWithCache(eventId: string) {
  return cache.getOrSet(
    CACHE_KEYS.EVENT_ATTENDEES(eventId),
    async () => {
      return prisma.attendance.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    },
    { ttl: CACHE_TTL.EVENTS }
  );
}

export async function invalidateEventCache(eventId: string, ministryId?: string): Promise<void> {
  await cache.invalidate(
    CACHE_KEYS.EVENT(eventId),
    CACHE_KEYS.EVENT_ATTENDEES(eventId)
  );
  if (ministryId) {
    await cache.invalidate(
      CACHE_KEYS.UPCOMING_EVENTS(ministryId),
      CACHE_KEYS.MINISTRY_STATS(ministryId)
    );
  }
}

// ===== ROOMS =====

export async function getRoomWithCache(roomId: string) {
  return cache.getOrSet(
    CACHE_KEYS.ROOM(roomId),
    async () => {
      return prisma.room.findUnique({
        where: { id: roomId },
      });
    },
    { ttl: CACHE_TTL.ROOMS }
  );
}

export async function getMinistryRoomsWithCache(ministryId: string) {
  return cache.getOrSet(
    CACHE_KEYS.ROOM_LIST(ministryId),
    async () => {
      return prisma.room.findMany({
        where: { ministryId },
        orderBy: { name: 'asc' },
      });
    },
    { ttl: CACHE_TTL.ROOMS }
  );
}

export async function invalidateRoomCache(roomId: string, ministryId?: string): Promise<void> {
  await cache.invalidate(CACHE_KEYS.ROOM(roomId));
  if (ministryId) {
    await cache.invalidate(CACHE_KEYS.ROOM_LIST(ministryId));
  }
  await cache.deletePattern(`room:avail:${roomId}:*`);
}

// ===== USER PROFILES =====

export async function getUserProfileWithCache(userId: string) {
  return cache.getOrSet(
    CACHE_KEYS.USER_PROFILE(userId),
    async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        include: {
          ministry: true,
        },
      });
    },
    { ttl: CACHE_TTL.USER_PROFILE }
  );
}

export async function invalidateUserProfile(userId: string): Promise<void> {
  await cache.invalidate(
    CACHE_KEYS.USER_PROFILE(userId),
    CACHE_KEYS.USER_PREFERENCES(userId)
  );
  await invalidateUserPermissions(userId);
}

// ===== DASHBOARD STATISTICS =====

export async function getDashboardStatsWithCache(ministryId: string, userId?: string) {
  const key = CACHE_KEYS.DASHBOARD_STATS(ministryId, userId);
  return cache.getOrSet(
    key,
    async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalEvents,
        upcomingEvents,
        totalAttendance,
        recentActivity,
      ] = await Promise.all([
        prisma.event.count({
          where: { ministryId },
        }),
        prisma.event.count({
          where: {
            ministryId,
            startAt: { gte: now },
          },
        }),
        prisma.attendance.count({
          where: {
            event: { ministryId },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.auditLog.findMany({
          where: { ministryId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            action: true,
            createdAt: true,
            actor: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

      return {
        totalEvents,
        upcomingEvents,
        totalAttendance,
        recentActivity,
      };
    },
    { ttl: CACHE_TTL.DASHBOARD }
  );
}

export async function invalidateDashboardStats(ministryId: string): Promise<void> {
  await cache.deletePattern(`dashboard:stats:${ministryId}*`);
  await cache.invalidate(CACHE_KEYS.MINISTRY_STATS(ministryId));
}
