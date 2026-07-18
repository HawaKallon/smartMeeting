# Redis Caching Integration Examples

This guide shows how to add caching to your existing code with minimal changes.

## Pattern 1: Cache a Server Component Query

### Before (No Cache)
```typescript
// src/app/(app)/ministry/page.tsx
import { requireUser } from '@/lib/guard';
import { prisma } from '@/lib/prisma';

export default async function MinistryPage() {
  const user = await requireUser();
  
  // This query runs every time the page renders
  const ministry = await prisma.ministry.findUnique({
    where: { id: user.ministryId! },
    include: { users: true }
  });

  return <div>{ministry?.name}</div>;
}
```

### After (With Cache)
```typescript
// src/app/(app)/ministry/page.tsx
import { requireUser } from '@/lib/guard';
import { getMinistryWithCache } from '@/lib/cacheHelpers';

export default async function MinistryPage() {
  const user = await requireUser();
  
  // First time: database query. Subsequent calls (within 30 min): cache hit
  const ministry = await getMinistryWithCache(user.ministryId!);

  return <div>{ministry?.name}</div>;
}
```

**Change:** Replace `prisma.ministry.findUnique()` with `getMinistryWithCache()`

## Pattern 2: Cache + Invalidation in Server Action

### Before (No Cache)
```typescript
// src/app/(app)/rooms/actions.ts
"use server"

import { prisma } from '@/lib/prisma';
import { assertStaffRole } from '@/lib/guard';
import { revalidatePath } from 'next/cache';

export async function updateRoom(roomId: string, formData: FormData) {
  await assertStaffRole();
  
  const name = formData.get('name') as string;

  await prisma.room.update({
    where: { id: roomId },
    data: { name }
  });

  revalidatePath('/rooms');
}
```

### After (With Cache Invalidation)
```typescript
// src/app/(app)/rooms/actions.ts
"use server"

import { prisma } from '@/lib/prisma';
import { assertStaffRole } from '@/lib/guard';
import { invalidateRoomCache } from '@/lib/cacheHelpers';
import { revalidatePath } from 'next/cache';

export async function updateRoom(roomId: string, formData: FormData) {
  const user = await assertStaffRole();
  
  const name = formData.get('name') as string;

  const room = await prisma.room.update({
    where: { id: roomId },
    data: { name }
  });

  // Clear the cache for this room and ministry rooms list
  await invalidateRoomCache(roomId, room.ministryId);

  revalidatePath('/rooms');
}
```

**Changes:**
1. Import the `invalidate*` function
2. After the database update, call the invalidate function
3. Pass the relevant IDs (roomId, ministryId, etc.)

## Pattern 3: Cache in Dashboard Component

### Before
```typescript
// src/app/(app)/dashboard/page.tsx
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';

export default async function Dashboard() {
  const user = await requireUser();

  // Each of these is a database query
  const [totalEvents, upcomingEvents, totalAttendance] = await Promise.all([
    prisma.event.count({ where: { ministryId: user.ministryId } }),
    prisma.event.count({
      where: { 
        ministryId: user.ministryId,
        startTime: { gte: new Date() }
      }
    }),
    prisma.attendance.count({
      where: { event: { ministryId: user.ministryId } }
    })
  ]);

  return (
    <div>
      <p>Total Events: {totalEvents}</p>
      <p>Upcoming: {upcomingEvents}</p>
      <p>Total Attendance: {totalAttendance}</p>
    </div>
  );
}
```

### After
```typescript
// src/app/(app)/dashboard/page.tsx
import { requireUser } from '@/lib/guard';
import { getDashboardStatsWithCache } from '@/lib/cacheHelpers';

export default async function Dashboard() {
  const user = await requireUser();

  // Single cached call that returns all stats
  // Results cached for 5 minutes
  const stats = await getDashboardStatsWithCache(user.ministryId);

  return (
    <div>
      <p>Total Events: {stats.totalEvents}</p>
      <p>Upcoming: {stats.upcomingEvents}</p>
      <p>Total Attendance: {stats.totalAttendance}</p>
    </div>
  );
}
```

**Benefits:**
- Fewer database queries
- Faster dashboard load time
- Automatic cache refresh every 5 minutes

## Pattern 4: Conditional Cache (Cache Only If Enabled)

For features that should work with or without Redis:

```typescript
// src/lib/cacheHelpers.ts
import { isCacheFeatureEnabled } from './cacheConfig';

export async function getEventWithCache(eventId: string) {
  const shouldCache = isCacheFeatureEnabled('CACHE_EVENTS');

  if (!shouldCache) {
    // Fallback to direct query if cache disabled
    return prisma.event.findUnique({
      where: { id: eventId }
    });
  }

  return cache.getOrSet(
    CACHE_KEYS.EVENT(eventId),
    async () => prisma.event.findUnique({
      where: { id: eventId }
    }),
    { ttl: CACHE_TTL.EVENTS }
  );
}
```

## Pattern 5: Manual Cache with Custom TTL

For custom queries not in cache helpers:

```typescript
// src/app/(app)/analytics/page.tsx
import { cache } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

export default async function AnalyticsPage() {
  const user = await requireUser();

  // Cache a custom query for 1 hour with pattern key
  const monthlyReport = await cache.getOrSet(
    `report:monthly:${user.ministryId}:${new Date().getMonth()}`,
    async () => {
      return prisma.attendance.groupBy({
        by: ['eventId'],
        where: { event: { ministryId: user.ministryId } },
        _count: true
      });
    },
    { ttl: 3600 } // 1 hour
  );

  return <div>{/* Render report */}</div>;
}
```

## Pattern 6: Invalidation After Multiple Operations

When one action affects multiple cached items:

```typescript
// src/app/(app)/events/actions.ts
"use server"

export async function deleteEvent(eventId: string) {
  const user = await assertStaffRole();
  
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ministryId: true, roomId: true }
  });

  if (!event) throw new Error('Event not found');

  // Delete from database
  await prisma.event.delete({
    where: { id: eventId }
  });

  // Invalidate multiple caches at once
  await cache.invalidate(
    CACHE_KEYS.EVENT(eventId),
    CACHE_KEYS.EVENT_ATTENDEES(eventId),
    CACHE_KEYS.UPCOMING_EVENTS(event.ministryId),
    CACHE_KEYS.ROOM_AVAILABILITY(event.roomId, event.startDate)
  );

  revalidatePath('/events');
}
```

## Pattern 7: Cache with Error Handling

```typescript
// Gracefully handle cache failures
export async function getUserWithCache(userId: string) {
  try {
    return await cache.getOrSet(
      CACHE_KEYS.USER_PROFILE(userId),
      async () => {
        return prisma.user.findUnique({
          where: { id: userId }
        });
      },
      { ttl: CACHE_TTL.USER_DATA }
    );
  } catch (err) {
    console.error('Cache error for user:', err);
    // Fallback to direct query
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }
}
```

## Pattern 8: Bulk Invalidation

Clear all caches for a ministry when settings change:

```typescript
// src/app/(app)/ministry/settings/actions.ts
"use server"

export async function updateMinistrySettings(ministryId: string, formData: FormData) {
  const user = await assertAdminRole();
  
  await prisma.ministry.update({
    where: { id: ministryId },
    data: { /* settings */ }
  });

  // Invalidate all ministry-related caches
  await invalidateMinistryCache(ministryId);
  
  // Also invalidate related dashboard stats
  await invalidateDashboardStats(ministryId);

  revalidatePath('/ministry/settings');
}
```

## Integration Checklist

- [ ] Install `ioredis`: `npm install ioredis`
- [ ] Add `REDIS_URL` to `.env`
- [ ] Replace slow database queries with cache helpers
- [ ] Add invalidation calls after all mutations
- [ ] Test with Redis running: `redis-cli ping`
- [ ] Test cache hits: Check logs for cache hits
- [ ] Monitor Redis: `redis-cli` commands
- [ ] Load test with caching enabled

## Common Mistakes to Avoid

❌ **Mistake 1: Forgetting to invalidate**
```typescript
// Bad: Cache won't update
await prisma.event.update({ data: { title: 'New Title' } });
revalidatePath('/events');
```

✅ **Fix: Always invalidate**
```typescript
// Good: Cache cleared, new data fetched
await prisma.event.update({ data: { title: 'New Title' } });
await invalidateEventCache(eventId, ministryId);
revalidatePath('/events');
```

---

❌ **Mistake 2: Caching user input**
```typescript
// Bad: User can manipulate cached values
cache.set(`user:${userId}`, userInput);
```

✅ **Fix: Only cache database values**
```typescript
// Good: Cache only from DB
const user = await prisma.user.findUnique({ where: { id: userId } });
cache.set(key, user);
```

---

❌ **Mistake 3: Long TTL on changing data**
```typescript
// Bad: Stale data for 24 hours
cache.set(key, data, { ttl: 86400 });
```

✅ **Fix: Appropriate TTL + event invalidation**
```typescript
// Good: 10 min TTL + explicit invalidation on change
cache.set(key, data, { ttl: 600 });
// Plus: invalidate after updates
```
