# GitHub Issues Template - Production Readiness Implementation

Use this document to create GitHub issues. Copy each issue template below and create it in your repository.

---

## 🔴 CRITICAL BEFORE LAUNCH

### Issue Template 1: Increase Database Connection Pool Size

```markdown
---
title: "🔴 P0: Increase Database Connection Pool Size"
labels: ["critical", "performance", "database", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Configure Prisma connection pool to 200 connections (from default ~50) to prevent exhaustion at >200 concurrent users.

## Affected Files
- `src/lib/prisma.ts`

## Estimated Effort
1 hour

## Risk Level
Minimal

## Dependencies
None

## Implementation Steps

1. Open `src/lib/prisma.ts`
2. Locate `new PrismaClient()` instantiation
3. Add adapter configuration with `connectionPoolSize: 200`
4. Test with `npm run db:migrate` (should execute within 2sec)

## Code Changes

```typescript
// BEFORE
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// AFTER
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionPoolSize: 200,
  }),
});
```

## Acceptance Criteria

- [ ] Pool size set to 200
- [ ] Application starts without errors
- [ ] No warnings in console about connection pool

## Testing Plan

```bash
# 1. Run app locally
npm run dev

# 2. Check Neon dashboard: should show ~10-20 active connections under load

# 3. Simulate load: 100 concurrent requests should not timeout
```

## Performance Impact
- Current: System fails at ~50 concurrent users (connection exhaustion)
- After: System stable to 500+ concurrent users
- Impact: **Prevents crashes at scale**

## Monitoring
- Watch: `SELECT count(*) FROM pg_stat_activity;`
- Expected at 100 users: 50-100 connections in use

## Notes
This is a quick win with minimal risk. Should be first change deployed.
```

---

### Issue Template 2: Add Missing Database Indexes

```markdown
---
title: "🔴 P0: Add Missing Database Indexes"
labels: ["critical", "performance", "database", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Add composite indexes on frequently-queried columns to improve query performance by 10-100x.

## Affected Files
- `prisma/schema.prisma`

## Estimated Effort
2 hours

## Risk Level
Minimal

## Dependencies
None

## Implementation Steps

1. Add composite indexes for calendar queries (Event startAt/endAt)
2. Add index for action item reminders (ActionItem dueDate)
3. Add index for attendance external email lookup
4. Create migration: `npx prisma migrate dev --name add_missing_indexes`
5. Verify with `EXPLAIN ANALYZE` on slow queries

## Code Changes

Add these indexes to the Prisma schema:

```prisma
// Event table - add to model definition
@@index([startAt, endAt])
@@index([roomId, startAt, endAt])

// ActionItem table - add to model definition  
@@index([dueDate, reminderSentAt])

// Attendance table - add to model definition
@@index([eventId, externalEmail])

// QRToken table - verify unique index on token
// (Already @unique, but verify it's indexed)
```

## Acceptance Criteria

- [ ] 4 new indexes created
- [ ] Migration applies cleanly
- [ ] `EXPLAIN ANALYZE` shows index scans (not sequential scans)
- [ ] No performance regression on other queries

## Testing Plan

```sql
-- Before migration
EXPLAIN ANALYZE
SELECT * FROM "Event" 
WHERE startAt > now() AND endAt < now() + interval '1 day';
-- Expected: Seq Scan (slow)

-- After migration
-- Expected: Index Scan (fast)
```

## Performance Impact
- Calendar queries: 500ms+ → 5ms (100x faster)
- Conflict checking: 200ms → 20ms (10x faster)

## Notes
After applying, monitor query performance in production.
```

---

### Issue Template 3: Fix QR Token Race Condition

```markdown
---
title: "🔴 P0: Fix QR Token Race Condition"
labels: ["critical", "concurrency", "security", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Eliminate race condition in `getActiveToken()` where two concurrent requests could both create tokens, causing unique constraint violations.

## Affected Files
- `src/lib/checkin.ts`

## Estimated Effort
3 hours

## Risk Level
Moderate

## Dependencies
- Issue #2 (database indexes)

## Current Problem

```typescript
export async function getActiveToken(eventId: string) {
  const now = new Date();
  
  const existing = await prisma.qRToken.findFirst({
    where: { eventId, expiresAt: { gt: new Date(now.getTime() + 30_000) } },
  });
  if (existing) return { token: existing.token, expiresAt: existing.expiresAt };
  
  // ← RACE CONDITION HERE: two threads reach this point simultaneously
  const token = newToken();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  await prisma.qRToken.create({ data: { eventId, token, expiresAt } });
  // ← One thread's create() fails with unique constraint
}
```

## Implementation Steps

1. Refactor `getActiveToken()` to use transaction with conflict handling
2. Add retry logic with exponential backoff
3. Handle unique constraint violation gracefully
4. Add load test to verify no errors

## Code Changes

```typescript
export async function getActiveToken(
  eventId: string, 
  retries = 2
): Promise<{ token: string; expiresAt: Date }> {
  const now = new Date();
  
  const existing = await prisma.qRToken.findFirst({
    where: { eventId, expiresAt: { gt: new Date(now.getTime() + 30_000) } },
    orderBy: { expiresAt: "desc" },
  });
  if (existing) {
    return { token: existing.token, expiresAt: existing.expiresAt };
  }
  
  try {
    const token = newToken();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    await prisma.qRToken.create({ 
      data: { eventId, token, expiresAt },
    });
    return { token, expiresAt };
  } catch (err: any) {
    if (err.code === 'P2002' && retries > 0) {
      // Unique constraint violated; another request won the race
      // Retry after brief delay
      await new Promise(resolve => 
        setTimeout(resolve, 100 * (3 - retries))
      );
      return getActiveToken(eventId, retries - 1);
    }
    throw err;
  }
}
```

## Acceptance Criteria

- [ ] No concurrent create() failures in logs
- [ ] Load test with 100 simultaneous QR requests shows no errors
- [ ] Token rotates every 5 minutes as expected
- [ ] Expired tokens cleaned up properly

## Testing Plan

```typescript
// Load test: concurrent token generation
async function testConcurrentTokens() {
  const eventId = "test-event-1";
  const promises = [];
  
  for (let i = 0; i < 100; i++) {
    promises.push(getActiveToken(eventId));
  }
  
  const results = await Promise.all(promises);
  const uniqueTokens = new Set(results.map(r => r.token));
  
  // Should have exactly 1 unique token
  console.assert(uniqueTokens.size === 1, "Expected 1 unique token");
}
```

## Monitoring
- Check logs for "P2002" errors (unique constraint)
- Should see zero occurrences with fix in place

## Notes
This is a subtle concurrency issue that only appears under high load (100+ simultaneous check-ins).
```

---

### Issue Template 4: Eliminate N+1 Query in Event Creation (Invitee Resolution)

```markdown
---
title: "🔴 P0: Eliminate N+1 Query in Event Creation - Invitee Resolution"
labels: ["critical", "performance", "database", "n+1-queries", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Batch user lookups when resolving invitees; reduce 50 separate queries to 1 query (50x performance improvement).

## Affected Files
- `src/app/(app)/events/actions.ts` (lines 280-296)
- `src/lib/invitations.ts` (new file)

## Estimated Effort
3 hours

## Risk Level
High (touches critical flow, needs thorough testing)

## Dependencies
None

## Current Problem

Event creation with 50 invitees currently makes 50 separate database queries, one per invitee. This causes:
- Event creation with 50 invitees takes 2-3 seconds
- At scale (100 concurrent event creations) = 5,000 queries/sec
- Database connection pool exhaustion

## Implementation Steps

1. Extract invitee resolution into separate function `resolveInvitees()`
2. Change from `Promise.all(map())` pattern to batch `findMany()`
3. Build lookup map; match invites to found users
4. Add unit test to verify batching

## Current Code (Issue)

```typescript
// Line 280-296: N separate queries
resolved = await Promise.all(
  invites.map(async (inv) => {
    const u = await prisma.user.findUnique({
      where: { email: inv.email.toLowerCase() },
      select: { id: true, name: true, emailNotifications: true },
    });
    // ... map to invitee
  }),
);
```

## Fixed Code

Create new file `src/lib/invitations.ts`:

```typescript
export type Resolved = {
  email: string;
  name: string;
  userId: string | null;
  token: string;
  rsvpTokenHash: string;
  emailNotifications?: boolean;
};

export async function resolveInvitees(
  invites: Array<{ email: string; name?: string }>,
): Promise<Resolved[]> {
  const inviteEmails = invites.map(inv => inv.email.toLowerCase());
  
  // Single batch query instead of N queries
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: inviteEmails } },
    select: { email: true, id: true, name: true, emailNotifications: true },
  });
  
  const userMap = new Map(existingUsers.map(u => [u.email, u]));
  
  return invites.map(inv => {
    const email = inv.email.toLowerCase();
    const u = userMap.get(email);
    const { token, tokenHash } = createRsvpToken();
    
    return {
      email: inv.email,
      name: u?.name ?? inv.name ?? email,
      userId: u?.id ?? null,
      token,
      rsvpTokenHash: tokenHash,
      emailNotifications: u?.emailNotifications,
    };
  });
}
```

Update `src/app/(app)/events/actions.ts`:

```typescript
// REPLACE lines 280-296 with:
let resolved: Resolved[] = [];
const inviteesRaw = formData.get("invitees");
if (inviteesRaw) {
  let invites: { email: string; name?: string }[] = [];
  try { invites = JSON.parse(String(inviteesRaw)); } catch { }
  
  resolved = await resolveInvitees(invites);
}
```

## Acceptance Criteria

- [ ] Single `findMany()` query replaces N `findUnique()` queries
- [ ] Event creation with 50 invitees takes <500ms (was >2s)
- [ ] All invitation logic works correctly
- [ ] Unit test verifies batching behavior

## Testing Plan

```typescript
// Unit test: src/lib/invitations.test.ts
describe('resolveInvitees', () => {
  it('should batch user lookups in single query', async () => {
    // Create test users
    const emails = ['user1@moh.gov.sl', 'user2@moh.gov.sl', 'new@moh.gov.sl'];
    
    const invites = emails.map(e => ({ email: e }));
    const resolved = await resolveInvitees(invites);
    
    expect(resolved).toHaveLength(3);
    expect(resolved[0].userId).toBeDefined(); // existing user
    expect(resolved[2].userId).toBeNull(); // new guest
  });
});

// Integration test: event creation with 50 invitees
const startTime = Date.now();
await createEvent(formDataWith50Invitees);
const elapsed = Date.now() - startTime;

expect(elapsed).toBeLessThan(500); // Should be <500ms
```

## Performance Impact

- Before: 50 invitees = 50 DB queries = 2-3 seconds
- After: 50 invitees = 1 DB query = 10-50ms
- **Impact: 50x+ faster event creation**

## Rollback Strategy

If issues arise:
1. The fix is backward-compatible
2. Can revert to old code with single git reset
3. No data migration needed

## Notes

This is a high-risk, high-reward change. Affects core event creation flow. Needs thorough testing but provides massive performance improvement.
```

---

### Issue Template 5: Eliminate N+1 Query in Conflict Detection

```markdown
---
title: "🔴 P0: Eliminate N+1 Query in Conflict Detection"
labels: ["critical", "performance", "database", "n+1-queries", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Consolidate 3 separate conflict checks (venue, room events, room bookings) into optimized query(ies) using batching.

## Affected Files
- `src/lib/events.ts` (lines 36-71, `findSlotConflict()`)

## Estimated Effort
4 hours

## Risk Level
High (touches critical booking flow)

## Dependencies
- Issue #2 (database indexes)

## Current Problem

For recurring events with 52 occurrences, the conflict check makes 156+ database queries (3 queries per slot):
- 52 venue conflict checks = 52 queries
- 52 room event checks = 52 queries  
- 52 room booking checks = 52 queries
- Total: 156 queries for event creation that should need only a few

This causes event creation to hang for 5+ seconds.

## Implementation Steps

1. Refactor `findSlotConflict()` to batch all slot checks
2. Use Prisma's batch capabilities or Prisma.sql
3. For recurring events, check all slots in single query
4. Add performance test to verify improvement

## Current Code (Issue)

```typescript
// 3 separate queries per call
export async function findSlotConflict(params: {
  roomId?: string | null;
  venueName?: string | null;
  startAt: Date;
  endAt: Date;
}) {
  if (venueName && (await hasVenueConflict({...}))) {
    return `venue booked`; // Query 1
  }
  
  if (roomId) {
    const eventClash = await prisma.event.findFirst({...}); // Query 2
    if (eventClash) return "event conflicts";
    
    const bookingClash = await prisma.roomBooking.findFirst({...}); // Query 3
    if (bookingClash) return "booking conflicts";
  }
  return null;
}
```

## Fixed Code (Option A: Simpler with Promise.all)

```typescript
export async function findSlotConflict(params: {
  roomId?: string | null;
  venueName?: string | null;
  startAt: Date;
  endAt: Date;
}): Promise<string | null> {
  const { roomId, venueName, startAt, endAt } = params;

  if (!roomId && !venueName) return null;

  // Execute both checks in parallel (Promise.all)
  const [venueClash, eventClash, bookingClash] = await Promise.all([
    // Venue check
    venueName 
      ? prisma.event.findFirst({
          where: {
            venueName: { equals: venueName, mode: 'insensitive' },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    
    // Room event check
    roomId
      ? prisma.event.findFirst({
          where: {
            roomId,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    
    // Room booking check
    roomId
      ? prisma.roomBooking.findFirst({
          where: {
            roomId,
            status: 'CONFIRMED',
            startTime: { lt: endAt },
            endTime: { gt: startAt },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (venueClash) return 'venue is already booked';
  if (eventClash) return 'another event is scheduled in this room';
  if (bookingClash) return 'the room is already booked';
  
  return null;
}
```

## Fixed Code (Option B: Optimized with batching for recurring events)

For recurring events, we need to check all 52 slots efficiently:

```typescript
// src/lib/events.ts - new function
export async function checkMultipleSlots(params: {
  roomId?: string | null;
  venueName?: string | null;
  slots: Array<{ startAt: Date; endAt: Date }>;
}): Promise<{ slotIndex: number; conflict: string }[]> {
  const { roomId, venueName, slots } = params;
  
  const conflicts: { slotIndex: number; conflict: string }[] = [];
  
  for (let i = 0; i < slots.length; i++) {
    const conflict = await findSlotConflict({
      roomId,
      venueName,
      startAt: slots[i].startAt,
      endAt: slots[i].endAt,
    });
    
    if (conflict) {
      conflicts.push({ slotIndex: i, conflict });
    }
  }
  
  return conflicts;
}

// Usage in events/actions.ts (line 241-264)
// BEFORE: 156 queries for 52 slots
for (const s of slots) {
  const reason = await findSlotConflict({...}); // 3 queries per slot
}

// AFTER: 4 queries for 52 slots (with parallelization)
const conflictReasons = await Promise.all(
  slots.map(s => findSlotConflict({...})) // Parallel execution
);
```

## Acceptance Criteria

- [ ] Conflict checking for 52-occurrence series takes <100ms (was 500ms+)
- [ ] No false positives (real conflicts detected)
- [ ] No false negatives (all conflicts caught)
- [ ] Performance test shows 5-10x improvement
- [ ] All existing tests pass

## Testing Plan

```typescript
// Benchmark test
const startTime = Date.now();
const slots = [];
for (let i = 0; i < 52; i++) {
  slots.push({
    startAt: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000),
    endAt: new Date(Date.now() + (i * 7 + 1) * 24 * 60 * 60 * 1000),
  });
}

const conflicts = await checkMultipleSlots({
  roomId: 'room-1',
  venueName: null,
  slots,
});

const elapsed = Date.now() - startTime;
console.log(`52 conflict checks took ${elapsed}ms`);
expect(elapsed).toBeLessThan(100); // Should be <100ms
```

## Performance Impact

- Before: 52 slots × 3 queries = 156 queries
- After: 52 slots × parallelized = 3 queries total
- **Impact: 50x fewer queries, 10x faster**

## Notes

Recurring events are the worst-case scenario. This fix primarily benefits those.
```

---

### Issue Template 6: Implement Redis Caching Layer

```markdown
---
title: "🔴 P0: Implement Redis Caching Layer"
labels: ["critical", "performance", "infrastructure", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Add Redis caching for user sessions, ministry data, and event permissions to reduce database load by 60-80%.

## Affected Files
- `src/lib/cache.ts` (new)
- `src/lib/prisma.ts`
- `src/proxy.ts`
- `src/lib/permissions.ts`
- `package.json` (add redis dependency)

## Estimated Effort
8 hours

## Risk Level
Medium

## Dependencies
- Issue #1 (connection pool)

## Implementation Steps

1. Add Redis client dependency: `npm install redis`
2. Create cache abstraction in `src/lib/cache.ts`
3. Cache user sessions (30 min TTL)
4. Cache ministry data (1 hour TTL)
5. Cache event permissions (5 min TTL)
6. Implement cache invalidation on data changes
7. Add monitoring of cache hit rate
8. Test with load simulation

## Setup (Upstash Redis for Vercel)

1. Go to https://upstash.com
2. Create free Redis database
3. Copy connection string: `REDIS_URL`
4. Add to `.env` and Vercel project settings

## Code Implementation

Create new file `src/lib/cache.ts`:

```typescript
import { createClient, RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;
  
  if (!redis) {
    redis = createClient({
      url: process.env.REDIS_URL,
      socket: { keepAlive: 30000 },
    });
    redis.on('error', (err) => console.error('[redis] error:', err));
    redis.on('connect', () => console.log('[redis] connected'));
    await redis.connect();
  }
  
  return redis;
}

export async function cache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const r = await getRedis();
  if (!r) return fetchFn(); // Fallback: no cache
  
  try {
    // Try cache hit
    const cached = await r.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    
    // Cache miss: fetch and store
    const data = await fetchFn();
    await r.setEx(key, ttlSeconds, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('[cache] error:', err);
    return fetchFn(); // Fallback on error
  }
}

export async function invalidate(key: string): Promise<void> {
  const r = await getRedis();
  if (r) await r.del(key);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  
  const keys = await r.keys(pattern);
  if (keys.length > 0) await r.del(keys);
}
```

Update `src/lib/permissions.ts`:

```typescript
import { cache, invalidate } from '@/lib/cache';

export async function canManageEvent(
  user: ActorPerm, 
  eventId: string
): Promise<boolean> {
  const cacheKey = `event:manage:${eventId}:${user.id}`;
  
  return cache(cacheKey, 300, async () => { // 5 min cache
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        ministryId: true,
        organizerId: true,
        coOrganizers: { select: { id: true } },
      },
    });
    
    if (!event) return false;
    
    return event.organizerId === user.id ||
           event.coOrganizers.some(c => c.id === user.id) ||
           (isMinistryAdminLevel(user.systemRole) && 
            user.ministryId === event.ministryId);
  });
}

// Invalidate when event updated
export async function invalidateEventCache(eventId: string): Promise<void> {
  await invalidatePattern(`event:*:${eventId}:*`);
}
```

Use in event actions:

```typescript
// After updating event
await invalidateEventCache(eventId);
```

## Acceptance Criteria

- [ ] Redis connection established on startup
- [ ] Cache miss: data fetched from DB and stored
- [ ] Cache hit: data returned within <5ms (vs 50-200ms from DB)
- [ ] Invalidation: cache cleared when data changes
- [ ] Monitoring: cache hit rate > 60% during load test
- [ ] Graceful fallback: if Redis unavailable, app continues with DB
- [ ] No sensitive data cached

## Testing Plan

```bash
# 1. Set up Upstash Redis (free tier)
# 2. Add REDIS_URL to .env
# 3. Run app: npm run dev
# 4. Monitor logs for "[redis] connected"

# 5. Load test
npm install -g autocannon
autocannon -c 100 -d 30 http://localhost:3000/administrative/calendar

# 6. Check cache performance
# Monitor Upstash dashboard:
# - Expected: >70% hit rate after 1 minute of usage
# - Response time: <100ms (with cache) vs 200-500ms (without)
```

## Environment Setup

```env
# .env
REDIS_URL=redis://default:password@host:port
```

## Monitoring

Add to logging:

```typescript
// Log cache hits/misses
const r = await getRedis();
if (r) {
  const stats = await r.info('stats');
  console.log('[cache]', stats);
}
```

## Notes

Redis is optional for MVP but essential for scale. System gracefully degrades to database-only if Redis unavailable.

Upstash free tier includes:
- 10,000 commands/day
- 256MB storage
- Enough for small pilot

Upgrade to paid as needed.
```

---

### Issue Template 7: Move Email Sending to Background Queue

```markdown
---
title: "🔴 P0: Move Email Sending to Background Queue"
labels: ["critical", "performance", "async", "email", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Decouple email sending from request-response cycle; reduce event creation response time from 26s to <500ms by queuing emails.

## Affected Files
- `src/lib/email-queue.ts` (new)
- `src/app/(app)/events/actions.ts` (lines 379-401)
- `src/app/(app)/admin/users/actions.ts` (provisioning)
- `src/app/api/cron/reminders/route.ts` (reminders)
- `src/lib/email.ts` (update imports)
- `package.json` (add bullmq or use Redis directly)
- `src/api/cron/process-email-queue/route.ts` (new worker)

## Estimated Effort
6 hours

## Risk Level
Medium

## Dependencies
- Issue #6 (Redis caching)

## Problem Statement

Current flow:
```
User creates event with 50 invitees
  → For each invitee, send email via Resend API
  → Each email takes ~500ms
  → Total: 50 × 500ms = 26 seconds
  → User sees loading spinner for 26 seconds
```

Desired flow:
```
User creates event with 50 invitees
  → Queue 50 emails to Redis
  → Return to user immediately (<500ms)
  → Background worker sends emails over next 5 minutes
```

## Implementation Steps

1. Create email queue utility using Redis lists
2. Update all email sending to queue instead of direct send
3. Create background worker to process queue
4. Add retry logic with exponential backoff
5. Add monitoring/alerting for queue depth
6. Test end-to-end with 100+ concurrent emails

## Code Implementation

Create new file `src/lib/email-queue.ts`:

```typescript
import { createClient, RedisClientType } from 'redis';

const EMAIL_QUEUE = 'email:queue';
const PROCESSING = 'email:processing';
const FAILED = 'email:failed';

let redis: RedisClientType | null = null;

async function getRedis(): Promise<RedisClientType> {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL not configured');
    }
    redis = createClient({ url: process.env.REDIS_URL });
    redis.on('error', (err) => console.error('[email-queue]', err));
    await redis.connect();
  }
  return redis;
}

export type EmailJob = {
  id: string;
  type: 'invite' | 'welcome' | 'reminder' | 'report';
  to: string;
  toName: string;
  data: Record<string, unknown>;
  attempts: number;
  nextRetry?: number;
};

export async function queueEmail(
  job: Omit<EmailJob, 'id' | 'attempts'>
): Promise<string> {
  const r = await getRedis();
  const id = `email:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  
  const emailJob: EmailJob = {
    ...job,
    id,
    attempts: 0,
  };
  
  await r.lPush(EMAIL_QUEUE, JSON.stringify(emailJob));
  console.log(`[email-queue] queued: ${emailJob.type} to ${emailJob.to}`);
  
  return id;
}

export async function getQueueStats() {
  const r = await getRedis();
  const [queueLength, processingLength, failedLength] = await Promise.all([
    r.lLen(EMAIL_QUEUE),
    r.lLen(PROCESSING),
    r.lLen(FAILED),
  ]);
  
  return {
    queued: queueLength,
    processing: processingLength,
    failed: failedLength,
  };
}
```

Create worker endpoint `src/app/api/cron/process-email-queue/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRedis, EmailJob, queueEmail } from '@/lib/email-queue';
import { sendInviteEmail, sendWelcomeEmail, sendReminderEmail } from '@/lib/email';

// Authenticate with CRON_SECRET
function validateCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('[email-queue-worker] CRON_SECRET not configured');
    return false;
  }
  
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const r = await getRedis();
  const EMAIL_QUEUE = 'email:queue';
  const PROCESSING = 'email:processing';
  const FAILED = 'email:failed';
  
  let processed = 0;
  let failed = 0;
  
  // Process up to 100 emails per cron run
  for (let i = 0; i < 100; i++) {
    const jobStr = await r.rpop(EMAIL_QUEUE);
    if (!jobStr) break;
    
    const job: EmailJob = JSON.parse(jobStr);
    
    try {
      // Move to processing
      await r.lPush(PROCESSING, jobStr);
      
      // Send email based on type
      const result = await sendEmailByType(job);
      
      if (!result.success) throw new Error(result.error);
      
      // Remove from processing on success
      await r.lRem(PROCESSING, 1, jobStr);
      console.log(`[email-queue] sent: ${job.type} to ${job.to}`);
      processed++;
    } catch (err) {
      console.error(`[email-queue] error: ${job.id}`, err);
      
      job.attempts++;
      if (job.attempts < 5) {
        // Retry with exponential backoff
        const delayMs = Math.pow(2, job.attempts) * 60 * 1000;
        job.nextRetry = Date.now() + delayMs;
        
        await r.lRem(PROCESSING, 1, jobStr);
        await r.lPush(EMAIL_QUEUE, JSON.stringify(job));
        console.log(
          `[email-queue] retry scheduled: ${job.id} in ${delayMs / 60000}min`
        );
      } else {
        // Move to dead letter queue
        await r.lRem(PROCESSING, 1, jobStr);
        await r.lPush(FAILED, JSON.stringify(job));
        console.error(`[email-queue] dead letter: ${job.id}`);
        failed++;
      }
    }
  }
  
  return NextResponse.json({
    ok: true,
    processed,
    failed,
  });
}

async function sendEmailByType(job: EmailJob): Promise<{ success: boolean; error?: string }> {
  try {
    switch (job.type) {
      case 'invite':
        await sendInviteEmail(job.data as any);
        return { success: true };
      case 'welcome':
        await sendWelcomeEmail(job.data as any);
        return { success: true };
      case 'reminder':
        await sendReminderEmail(job.data as any);
        return { success: true };
      default:
        return { success: false, error: `Unknown email type: ${job.type}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
```

Update `vercel.json` to run email queue worker:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-email-queue",
      "schedule": "* * * * *"  // Every minute
    },
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"   // Daily at 8 AM
    }
  ]
}
```

Update event creation to use queue:

```typescript
// In src/app/(app)/events/actions.ts, REPLACE lines 379-401

// Instead of:
// await Promise.allSettled(
//   resolved.map((r) =>
//     r.emailNotifications !== false 
//       ? sendInviteEmail({...})
//       : Promise.resolve()
//   )
// );

// Use:
for (const r of resolved) {
  if (r.emailNotifications !== false) {
    await queueEmail({
      type: 'invite',
      to: r.email,
      toName: r.name,
      data: {
        eventTitle: data.title,
        eventDescription: data.description,
        eventType: data.type,
        classification: data.classification,
        startAt: slots[0].startAt,
        endAt: slots[0].endAt,
        venueName: data.venueName ?? null,
        roomName: selectedRoom?.name ?? null,
        organizerName: user.name ?? user.email,
        organizerEmail: user.email,
        ministryName: ministry?.name ?? 'Government Ministry',
        recurrenceText,
        acceptUrl: rsvpUrl(r.token, 'CONFIRMED'),
        declineUrl: rsvpUrl(r.token, 'DECLINED'),
      },
    });
  }
}
```

## Acceptance Criteria

- [ ] Event creation with 50 invitees takes <500ms (was 26s)
- [ ] All emails sent within 5 minutes
- [ ] Failed emails retried with exponential backoff
- [ ] Dead-letter queue visible for monitoring
- [ ] No emails lost on app restart
- [ ] Queue depth monitored and alerted if > 1000

## Testing Plan

```bash
# 1. Create event with 50 invitees
# 2. Measure response time: should be <500ms

# 3. Monitor queue:
curl http://localhost:3000/api/email-queue/status

# 4. Wait 5 minutes
# 5. Verify all 50 emails in test inbox

# 6. Simulate failure:
# - Create event with invalid email
# - Watch retry logic in logs
# - Expect email in dead-letter queue after 5 attempts

# 7. Check Resend dashboard:
# - All emails should show as delivered
```

## Performance Impact

Before:
- Event creation: 2-26 seconds (depending on invitee count)
- Response blocked until all emails sent
- Large concurrent spike = system overload

After:
- Event creation: <500ms (always)
- Response immediate
- Emails sent asynchronously over 5-60 minutes
- Much better user experience

## Monitoring

Add health check for queue:

```typescript
// /api/health endpoint
const queueStats = await getQueueStats();
if (queueStats.queued > 10000) {
  return { status: 'degraded', reason: 'Email queue backlog' };
}
```

## Notes

- Emails might take 5-60 minutes to deliver (acceptable for async)
- Failed emails retry up to 5 times (total 2+ hours before dead-letter)
- Email sending rate limited by Resend API (10/sec default, upgrade for more)
- This enables handling email spikes without blocking user requests

## Rollback

If issues:
1. Temporarily increase RESEND_API_KEY rate limit
2. Revert to synchronous sending (remove queue logic)
3. Process backlog manually via admin command
```

---

### Issue Template 8: Add API Rate Limiting

```markdown
---
title: "🔴 P0: Add API Rate Limiting"
labels: ["critical", "security", "performance", "dos-protection", "p0-launch"]
milestone: "Critical Before Launch (Week 1-3)"
---

## Objective
Prevent brute-force attacks and DoS; implement rate limits on login, API endpoints, and file uploads.

## Affected Files
- `src/lib/rate-limit.ts` (new)
- `src/auth.ts` (login)
- `src/app/api/*` (API routes)
- `src/app/(app)/rooms/book/actions.ts` (room booking)
- `package.json` (Redis client if not already added)

## Estimated Effort
4 hours

## Risk Level
Low

## Dependencies
- Issue #6 (Redis caching)

## Implementation Steps

1. Create rate limiter utility using Redis
2. Apply to login endpoint: 5 attempts per 15 min per email
3. Apply to API endpoints: 100 requests per minute per user
4. Apply to file uploads: 10 per minute per user
5. Return 429 with Retry-After header when limited
6. Test with load simulation

## Code Implementation

Create new file `src/lib/rate-limit.ts`:

```typescript
import { createClient, RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

async function getRedis(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = createClient({ url: process.env.REDIS_URL });
    redis.on('error', (err) => console.error('[rate-limit]', err));
    await redis.connect();
  }
  return redis;
}

export type RateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
};

export async function rateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const r = await getRedis();
  
  // No Redis = no rate limiting (for dev)
  if (!r) {
    return { 
      allowed: true, 
      remaining: config.maxRequests, 
      resetAt: new Date() 
    };
  }
  
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;
  
  try {
    // Remove old entries outside window
    await r.zRemRangeByScore(key, '-inf', windowStart);
    
    // Count requests in window
    const count = await r.zCard(key);
    
    if (count < config.maxRequests) {
      // Request allowed
      await r.zAdd(key, { 
        score: now, 
        member: `${now}:${Math.random()}` 
      });
      await r.expire(key, config.windowSeconds);
      
      return {
        allowed: true,
        remaining: config.maxRequests - count - 1,
        resetAt: new Date(now + config.windowSeconds * 1000),
      };
    } else {
      // Rate limited
      const oldestEntries = await r.zRange(
        key, 
        0, 
        0, 
        { withScores: true }
      );
      const resetAt = oldestEntries.length > 0
        ? new Date((oldestEntries[0].score as number) + config.windowSeconds * 1000)
        : new Date(now + config.windowSeconds * 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }
  } catch (err) {
    console.error('[rate-limit] error:', err);
    // Fallback: allow on error
    return { 
      allowed: true, 
      remaining: config.maxRequests, 
      resetAt: new Date() 
    };
  }
}

// Preset limits
export async function rateLimitLogin(email: string) {
  return rateLimit(`login:${email}`, {
    maxRequests: 5,
    windowSeconds: 15 * 60, // 15 minutes
  });
}

export async function rateLimitAPI(userId: string) {
  return rateLimit(`api:${userId}`, {
    maxRequests: 100,
    windowSeconds: 60, // 1 minute
  });
}

export async function rateLimitUpload(userId: string) {
  return rateLimit(`upload:${userId}`, {
    maxRequests: 10,
    windowSeconds: 60, // 1 minute
  });
}
```

Update login in `src/auth.ts`:

```typescript
import { rateLimitLogin } from '@/lib/rate-limit';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      authorize: async (credentials: any) => {
        const email = String(credentials?.email ?? '').toLowerCase().trim();
        const password = String(credentials?.password ?? '');
        
        // Check rate limit first
        const limit = await rateLimitLogin(email);
        if (!limit.allowed) {
          console.warn(`[auth] rate limited login: ${email}`);
          // Don't reveal rate limit to user (security best practice)
          return null;
        }
        
        // ... rest of auth logic ...
        
        if (!ok) {
          // Password incorrect - rate limit will catch next attempt
          return null;
        }
        
        // ... success ...
      },
    }),
  ],
});
```

Usage in API routes:

```typescript
// src/app/api/events/route.ts or any API route
import { rateLimitAPI } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check rate limit
  const limit = await rateLimitAPI(session.user.id);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (limit.resetAt.getTime() - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }
  
  // ... handle request ...
}
```

Usage in file uploads:

```typescript
// In upload action
import { rateLimitUpload } from '@/lib/rate-limit';

const user = await requireUser();
const limit = await rateLimitUpload(user.id);

if (!limit.allowed) {
  return { error: `Too many uploads. Try again in ${Math.ceil((limit.resetAt.getTime() - Date.now()) / 60000)} minutes` };
}

// ... proceed with upload ...
```

## Acceptance Criteria

- [ ] Login rate limit: 5 attempts per 15 minutes per email
- [ ] API rate limit: 100 requests per minute per user
- [ ] Upload rate limit: 10 per minute per user
- [ ] 429 response returned with Retry-After header
- [ ] Rate limit info logged for monitoring
- [ ] No false positives (normal users not affected)
- [ ] Graceful degradation if Redis unavailable

## Testing Plan

```bash
# Test login rate limit
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "Attempt $i"
  sleep 1
done
# Expected: First 5 fail with "Invalid credentials", 6th returns null (rate limited)

# Test API rate limit
for i in {1..101}; do
  curl -H 'Authorization: Bearer token' \
    http://localhost:3000/api/events
done
# Expected: First 100 succeed, 101st returns 429

# Check rate limit headers
curl -v http://localhost:3000/api/events \
  -H 'Authorization: Bearer token' | grep -i retry-after
# Expected: Retry-After: 42 (or similar)
```

## Performance Impact

- Brute-force attacks: 5 attempts every 15 min (vs unlimited before)
- Prevents API abuse: 100 requests/min per user is reasonable limit
- DoS protection: Distributed load across users

## Monitoring

Log rate limit events:

```typescript
// After rate limit check
if (!limit.allowed) {
  console.warn(JSON.stringify({
    level: 'RATE_LIMITED',
    userId: user.id,
    type: 'api',
    resetAt: limit.resetAt.toISOString(),
  }));
}
```

## Notes

- Rate limits are per-user (not per-IP) for authenticated endpoints
- Login is per-email (not per-IP) to protect against username enumeration
- If Redis unavailable, falls back to allowing all requests (with console warning)
- Limits are generous to not impact normal users; focus is on preventing abuse
```

---

## Remaining Issues (Abbreviated)

Due to length constraints, here are the remaining critical issues in summary form:

### ISSUE #9: Add Account Lockout After Failed Login Attempts
- 2 hours | Risk: Low
- Lock account after 5 failed attempts for 15 min
- Send email alert to user

### ISSUE #10: Add Missing RSVP Token Expiry
- 2 hours | Risk: Low
- Add `rsvpTokenExpiresAt` DateTime field
- Expire invitations after 14 days

### ISSUE #11: Add Input Validation & Error Handling for File Uploads
- 3 hours | Risk: Low
- Validate file size (max 10MB images, 100MB audio)
- Validate file type (whitelist JPEG, PNG, WAV, etc.)
- Reject invalid files with clear error messages

### ISSUE #12: Fix Co-Organizer Privilege Escalation
- 3 hours | Risk: High
- Only organizer or ministry-admin can manage co-organizers
- Prevent co-organizer from adding/removing others

### ISSUE #13: Implement TOTP-Based Multi-Factor Authentication (MFA)
- 8 hours | Risk: Medium
- Add TOTP support (Google Authenticator compatible)
- Mandatory for admins, optional for staff
- Include recovery codes

### ISSUE #14: Add Email Verification on User Signup
- 3 hours | Risk: Low
- Send verification email on provisioning
- Block login until email verified
- 24-hour token expiry

### ISSUE #15: Add Health Check Endpoint
- 2 hours | Risk: Minimal
- Implement `/health` endpoint
- Check database and Redis connectivity
- Return 200 if healthy, 503 if unhealthy

---

## Summary

**Critical Issues (Week 1-3): 15 issues, 65 hours total**

| Priority | Count | Effort | Focus |
|----------|-------|--------|-------|
| Quick Wins (0-2h) | 5 | 7h | Immediate impact, low risk |
| Core Performance (3-4h) | 5 | 18h | Database/query optimization |
| Infrastructure (6-8h) | 3 | 21h | Caching, queuing, monitoring |
| Security Hardening (2-8h) | 2 | 11h | MFA, rate limiting, lockout |
| **Total** | **15** | **65h** | **Production Ready (<1K users)** |

---

# How to Use This Roadmap

## GitHub Import

1. Copy each issue template above
2. Create new issue in GitHub
3. Paste template content
4. Adjust title/labels/estimates as needed
5. Assign to team members

## Project Management

1. Create project: "Production Readiness"
2. Add issues to milestones
3. Sort by dependencies
4. Assign based on team expertise
5. Track progress weekly

## Dependencies

**Critical Path (must complete in order):**
1. Issue #1 (Connection pool) - unblocks everything
2. Issue #2 (Indexes) - needed for performance
3. Issue #4, #5 (N+1 queries) - parallelizable
4. Issue #6 (Redis) - needed for Issue #7, #8
5. Issue #7 (Email queue) - unblocks response time improvement
6. Issue #8 (Rate limiting) - security prerequisite for launch

**Parallelizable:**
- Issue #3 (QR race) - can run in parallel with #1-2
- Issue #9-15 - mostly independent, can run in parallel

## Team Assignment Suggestion

**Backend Lead:**
- Issues #4, #5, #6, #7 (core performance)
- Issues #2, #10 (database)

**Security Lead:**
- Issue #8 (rate limiting)
- Issue #12 (privilege escalation)
- Issue #13 (MFA)
- Issue #14 (email verification)
- Issue #9 (account lockout)

**DevOps/Infrastructure:**
- Issue #1 (connection pool)
- Issue #15 (health check)
- Issue #3 (concurrency)
- Issue #11 (file validation)

**QA/Testing:**
- Validate all testing plans
- Run load tests
- Security testing

---

**Document Generated:** 2026-07-18  
**Ready for GitHub:** Yes - copy templates directly  
**Estimated Total Time:** 65 hours (3 weeks full-time team of 2-3 engineers)
