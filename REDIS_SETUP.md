# Redis Caching Setup Guide

Redis is an optional in-memory cache layer for Smart Meeting that dramatically improves performance by caching frequently accessed data. This guide covers setup, configuration, and usage.

## Quick Start

### 1. Set up Redis (Choose One)

#### Option A: Redis Cloud (Recommended for Production)
1. Sign up at [redis.com](https://redis.com) or [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the connection URL (format: `redis://user:password@host:port`)
4. Add to `.env`:
```bash
REDIS_URL="redis://user:password@host:port"
```

#### Option B: Local Installation (Development)
```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Or start Redis directly
redis-server

# Linux
sudo apt-get install redis-server
sudo systemctl start redis-server
```

Add to `.env`:
```bash
REDIS_URL="redis://localhost:6379"
```

#### Option C: Docker (Team Development)
Add to your `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data

volumes:
  redis_data:
```

Then:
```bash
REDIS_URL="redis://redis:6379"
```

### 2. Install Dependencies
```bash
npm install ioredis
```

### 3. Test Connection
```bash
redis-cli ping
# Output: PONG
```

## Architecture

### Cache Layer (`src/lib/cache.ts`)
- Generic cache abstraction with `get`, `set`, `delete`, `getOrSet` operations
- Automatic JSON serialization/deserialization
- Graceful degradation: app works without Redis if unavailable
- TTL (time-to-live) support for automatic expiration

### Cache Helpers (`src/lib/cacheHelpers.ts`)
Pre-built functions for common queries:

**Permissions & Roles**
- `getUserRoleWithCache(userId)` — caches user role (15 min TTL)
- `invalidateUserPermissions(userId)` — clears permission caches on role change

**Ministry Lookups**
- `getMinistryWithCache(ministryId)` — caches ministry data (30 min)
- `getMinistryListWithCache()` — caches all ministries (30 min)
- `getMinistryUsersWithCache(ministryId)` — caches ministry staff (30 min)
- `invalidateMinistryCache(ministryId)` — clears on ministry update

**Calendar & Events**
- `getEventWithCache(eventId)` — caches event details (10 min)
- `getUpcomingEventsWithCache(ministryId)` — caches next 10 events (10 min)
- `getEventAttendeesWithCache(eventId)` — caches attendance (10 min)
- `invalidateEventCache(eventId, ministryId)` — clears on event change

**Rooms**
- `getRoomWithCache(roomId)` — caches room data (30 min)
- `getMinistryRoomsWithCache(ministryId)` — caches all rooms (30 min)
- `invalidateRoomCache(roomId, ministryId)` — clears on room update

**User Profiles**
- `getUserProfileWithCache(userId)` — caches profile (20 min)
- `invalidateUserProfile(userId)` — clears on profile update

**Dashboard Statistics**
- `getDashboardStatsWithCache(ministryId, userId?)` — caches stats (5 min)
- `invalidateDashboardStats(ministryId)` — clears on event/attendance change

## Usage Examples

### In Server Actions

```typescript
// src/app/(app)/events/actions.ts
"use server"

import { invalidateEventCache } from '@/lib/cacheHelpers';

export async function updateEvent(eventId: string, data: FormData) {
  // ... validation & update logic ...
  
  await prisma.event.update({
    where: { id: eventId },
    data: { /* ... */ }
  });

  // Invalidate cache after update
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ministryId: true }
  });
  
  await invalidateEventCache(eventId, event?.ministryId);
  revalidatePath('/events');
}
```

### In Server Components

```typescript
// src/app/(app)/dashboard/page.tsx
import { getDashboardStatsWithCache } from '@/lib/cacheHelpers';

export default async function Dashboard() {
  const user = await requireUser();
  
  // This will cache the result for 5 minutes
  const stats = await getDashboardStatsWithCache(user.ministryId);
  
  return (
    <div>
      <p>Total Events: {stats.totalEvents}</p>
      <p>Upcoming: {stats.upcomingEvents}</p>
    </div>
  );
}
```

## Cache Invalidation Strategy

This implementation uses **hybrid invalidation** (TTL + event-based):

1. **Time-Based (TTL)**
   - Permissions: 15 minutes
   - Ministries: 30 minutes
   - Events: 10 minutes
   - Rooms: 30 minutes
   - Profiles: 20 minutes
   - Dashboard: 5 minutes

2. **Event-Based (Manual)**
   - Call `invalidate*` functions after mutations
   - Always pair database updates with cache invalidation
   - Prevents serving stale data longer than TTL

## Monitoring

Check Redis connection status:
```bash
redis-cli
> PING
PONG

> DBSIZE
(integer) 42

> KEYS *
# Lists all keys

> FLUSHALL  # Clear all cache (use with caution!)
```

## Environment Variables

Add to `.env`:
```bash
# Redis connection URL (optional; caching disabled if absent)
# Format: redis://[user:password@]host:port[/db]
# Examples:
#   redis://localhost:6379
#   redis://:password@redis-cloud.example.com:6380
#   redis://user:pass@aws-elasticache.amazonaws.com:6379
REDIS_URL="redis://localhost:6379"
```

## Troubleshooting

### "Redis connection failed"
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL format in .env
- For cloud Redis, ensure firewall allows your IP

### Cache not persisting
- Check that `REDIS_URL` is set in .env
- Verify `isRedisConnected()` returns true
- Check Redis logs: `redis-cli monitor`

### High memory usage
- Redis keeps all data in memory; monitor with `redis-cli info memory`
- Consider reducing TTL values or using Redis with eviction policy
- Cloud providers offer automated memory management

### Development without Redis
- Simply omit `REDIS_URL` from .env
- App will work normally but cache features disabled
- No database hits are avoided, so queries may be slower
- Perfect for local development without infrastructure

## Performance Expectations

**With Redis caching enabled:**
- Dashboard stats: ~50ms (vs ~2s without cache)
- Permission checks: <1ms (vs ~100ms without cache)
- Event list queries: ~30ms (vs ~500ms without cache)

**Cache hit ratio:** Expect 70-85% hit rate in production

## Best Practices

1. **Always invalidate after mutations**
   ```typescript
   // ❌ Bad: Update without cache invalidation
   await prisma.event.update({ /* ... */ });
   
   // ✅ Good: Update + invalidate
   await prisma.event.update({ /* ... */ });
   await invalidateEventCache(eventId, ministryId);
   ```

2. **Use the right cache function**
   ```typescript
   // ✅ Use cache helper if available
   const ministry = await getMinistryWithCache(id);
   
   // ❌ Avoid direct cache operations
   const data = JSON.parse(await redis.get(`ministry:${id}`));
   ```

3. **Group invalidations**
   ```typescript
   // ✅ Efficient: One call
   await cache.invalidate(key1, key2, key3);
   
   // ❌ Inefficient: Multiple calls
   await cache.delete(key1);
   await cache.delete(key2);
   await cache.delete(key3);
   ```

4. **Don't cache user input**
   Only cache database reads and computed values, never user-provided data.

## Disabling Cache

To disable Redis caching:
1. Remove or comment out `REDIS_URL` in `.env`
2. App continues to work normally without cache
3. Uncomment `REDIS_URL` to re-enable

## Production Checklist

- [ ] Redis URL configured in production environment
- [ ] All database mutations followed by `invalidate*` calls
- [ ] Redis monitoring/alerting set up
- [ ] Regular database backups (if using persistent Redis)
- [ ] TTL values appropriate for your workload
- [ ] Load testing with cache enabled
- [ ] Monitoring dashboard stats cache hit rates
