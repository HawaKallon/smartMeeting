// Cache key patterns and TTL constants
export const CACHE_KEYS = {
  // Permissions (15 min, change on role update)
  USER_PERMISSIONS: (userId: string) => `perm:user:${userId}`,
  ROLE_CAPABILITIES: (role: string) => `role:cap:${role}`,
  USER_ROLE: (userId: string) => `user:role:${userId}`,

  // Ministry lookups (30 min, change on ministry update)
  MINISTRY: (ministryId: string) => `ministry:${ministryId}`,
  MINISTRY_LIST: 'ministry:list',
  MINISTRY_USERS: (ministryId: string) => `ministry:users:${ministryId}`,

  // Calendar & events (10 min, change on event update)
  EVENT: (eventId: string) => `event:${eventId}`,
  MINISTRY_EVENTS: (ministryId: string, month?: string) =>
    `events:ministry:${ministryId}${month ? `:${month}` : ''}`,
  UPCOMING_EVENTS: (ministryId: string) => `events:upcoming:${ministryId}`,
  EVENT_ATTENDEES: (eventId: string) => `event:attendees:${eventId}`,

  // Rooms (30 min, change on room update)
  ROOM: (roomId: string) => `room:${roomId}`,
  ROOM_LIST: (ministryId: string) => `rooms:ministry:${ministryId}`,
  ROOM_AVAILABILITY: (roomId: string, date: string) => `room:avail:${roomId}:${date}`,

  // User profiles (20 min, change on profile update)
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PREFERENCES: (userId: string) => `user:prefs:${userId}`,

  // Dashboard statistics (5 min, recompute frequently)
  DASHBOARD_STATS: (ministryId: string, userId?: string) =>
    `dashboard:stats:${ministryId}${userId ? `:${userId}` : ''}`,
  MINISTRY_STATS: (ministryId: string) => `stats:ministry:${ministryId}`,
  ATTENDANCE_SUMMARY: (eventId: string) => `attend:summary:${eventId}`,
} as const;

export const CACHE_TTL = {
  PERMISSIONS: 900, // 15 minutes
  MINISTRIES: 1800, // 30 minutes
  EVENTS: 600, // 10 minutes
  ROOMS: 1800, // 30 minutes
  USER_PROFILE: 1200, // 20 minutes
  DASHBOARD: 300, // 5 minutes
} as const;
