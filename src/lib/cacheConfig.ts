// Cache configuration and constants
// Adjust these values based on your performance requirements and data change frequency

export const CACHE_CONFIG = {
  // TTL values (in seconds) - how long before cache expires
  TTL: {
    // High-frequency, rarely-changing permission checks
    // Invalidate: on role/permission change
    PERMISSIONS: 900, // 15 minutes

    // Reference data, infrequent changes
    // Invalidate: on ministry/room/user update
    REFERENCE_DATA: 1800, // 30 minutes

    // Calendar data, frequent changes
    // Invalidate: on event create/update/cancel
    EVENTS: 600, // 10 minutes

    // User/profile data, moderate changes
    // Invalidate: on profile update
    USER_DATA: 1200, // 20 minutes

    // High-cost aggregations, acceptable staleness
    // Invalidate: on underlying event/attendance change
    STATISTICS: 300, // 5 minutes

    // Room availability, frequent queries
    // Invalidate: on room booking/event update
    AVAILABILITY: 300, // 5 minutes
  },

  // Enable/disable caching per feature
  FEATURES: {
    CACHE_PERMISSIONS: true,
    CACHE_MINISTRIES: true,
    CACHE_EVENTS: true,
    CACHE_ROOMS: true,
    CACHE_USERS: true,
    CACHE_DASHBOARD: true,
  },

  // Key prefixes for organization
  PREFIXES: {
    PERMISSION: 'perm:',
    ROLE: 'role:',
    USER: 'user:',
    MINISTRY: 'ministry:',
    EVENT: 'event:',
    ROOM: 'room:',
    STATS: 'stats:',
    DASHBOARD: 'dashboard:',
    AVAILABILITY: 'availability:',
  },

  // Maximum cache size limits (soft limits)
  LIMITS: {
    // Max items to cache per ministry
    MINISTRY_ITEMS: 10000,
    // Max individual cache entry size (100 KB)
    MAX_ENTRY_SIZE: 102400,
  },

  // Logging
  LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  LOG_CACHE_HITS: process.env.NODE_ENV !== 'production',
} as const;

// Helper to check if a feature is enabled
export function isCacheFeatureEnabled(feature: keyof typeof CACHE_CONFIG.FEATURES): boolean {
  return CACHE_CONFIG.FEATURES[feature];
}

// Helper to get TTL for a cache type
export function getCacheTTL(type: keyof typeof CACHE_CONFIG.TTL): number {
  return CACHE_CONFIG.TTL[type];
}
