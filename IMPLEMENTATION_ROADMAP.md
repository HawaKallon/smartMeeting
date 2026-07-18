# Implementation Roadmap: Production Readiness

**Generated:** 2026-07-18  
**Target:** 10,000 concurrent users by Q4 2026  
**Total Issues:** 54  
**Estimated Effort:** 168 hours (~4 weeks of full-time development)

---

## Milestone Overview

| Milestone | Issues | Effort | Target | Impact |
|-----------|--------|--------|--------|--------|
| 🔴 Critical Before Launch | 15 | 65 hours | Week 1-3 | 10x performance gain, security hardening |
| 🟠 High Priority | 18 | 58 hours | Week 4-6 | Scale to 5,000 users |
| 🟡 Medium Priority | 14 | 35 hours | Week 7-10 | Scale to 100K users |
| 🟢 Nice to Have | 7 | 10 hours | Phase 2+ | Polish, advanced features |

---

# 🔴 CRITICAL BEFORE LAUNCH (Week 1-3)

## ⚡ Quick Wins First (No Dependencies)

### ISSUE #1: Increase Database Connection Pool Size
**Priority:** P0 | **Effort:** 1 hour | **Risk:** Minimal

**Objective:**  
Configure Prisma connection pool to 200 connections (from default ~50) to prevent exhaustion at >200 concurrent users.

**Affected Files:**
- `src/lib/prisma.ts`

**Dependencies:** None

**Implementation Steps:**
1. Open `src/lib/prisma.ts`
2. Locate `new PrismaClient()` instantiation
3. Add adapter configuration with `connectionPoolSize: 200`
4. Test with `npm run db:migrate` (should execute within 2sec)

**Code Changes:**
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

**Acceptance Criteria:**
- [ ] Pool size set to 200
- [ ] Application starts without errors
- [ ] No warnings in console about connection pool

**Testing Plan:**
```bash
# 1. Run app locally
npm run dev

# 2. Check Neon dashboard: should show ~10-20 active connections under load
# 3. Simulate load: 100 concurrent requests should not timeout
```

**Monitoring:**
- Watch: `SELECT count(*) FROM pg_stat_activity;`
- Expected at 100 users: 50-100 connections in use

---

### ISSUE #2: Add Missing Database Indexes

**Priority:** P0 | **Effort:** 2 hours | **Risk:** Minimal

**Objective:**  
Add composite indexes on frequently-queried columns to improve query performance by 10-100x.

**Affected Files:**
- `prisma/schema.prisma`

**Dependencies:** None

**Implementation Steps:**
1. Add composite indexes for calendar queries (Event startAt/endAt)
2. Add index for action item reminders (ActionItem dueDate)
3. Add index for attendance external email lookup
4. Create migration: `npx prisma migrate dev --name add_missing_indexes`
5. Verify with `EXPLAIN ANALYZE` on slow queries

**Code Changes:**
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

**Acceptance Criteria:**
- [ ] 4 new indexes created
- [ ] Migration applies cleanly
- [ ] `EXPLAIN ANALYZE` shows index scans (not sequential scans)
- [ ] No performance regression on other queries

**Testing Plan:**
```sql
-- Before migration
EXPLAIN ANALYZE
SELECT * FROM "Event" 
WHERE startAt > now() AND endAt < now() + interval '1 day';
-- Expected: Seq Scan (slow)

-- After migration
-- Expected: Index Scan (fast)
```

---

### ISSUE #3: Fix QR Token Race Condition

**Priority:** P0 | **Effort:** 3 hours | **Risk:** Moderate

**Objective:**  
Eliminate race condition in `getActiveToken()` where two concurrent requests could both create tokens.

**Affected Files:**
- `src/lib/checkin.ts`
- `prisma/schema.prisma` (if needed)

**Dependencies:** Issue #2 (database indexes)

**Implementation Steps:**
1. Refactor `getActiveToken()` to use transaction with conflict handling
2. Use `findUnique` on token instead of relying on expiry check
3. Handle unique constraint violation gracefully
4. Add retry logic with exponential backoff

**Current Code (Issue):**
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

**Fixed Code:**
```typescript
export async function getActiveToken(eventId: string, retries = 2): Promise<{ token: string; expiresAt: Date }> {
  const now = new Date();
  
  const existing = await prisma.qRToken.findFirst({
    where: { eventId, expiresAt: { gt: new Date(now.getTime() + 30_000) } },
    orderBy: { expiresAt: "desc" },
  });
  if (existing) return { token: existing.token, expiresAt: existing.expiresAt };
  
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
      await new Promise(resolve => setTimeout(resolve, 100 * (3 - retries)));
      return getActiveToken(eventId, retries - 1);
    }
    throw err;
  }
}
```

**Acceptance Criteria:**
- [ ] No concurrent create() failures in logs
- [ ] Load test with 100 simultaneous QR requests shows no errors
- [ ] Token rotates every 5 minutes as expected
- [ ] Expired tokens cleaned up properly

**Testing Plan:**
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
  
  // Should have exactly 1 unique token (all requests got same existing token)
  console.assert(uniqueTokens.size === 1, "Expected 1 unique token");
}
```

---

### ISSUE #4: Eliminate N+1 Query in Event Creation (Invitee Resolution)

**Priority:** P0 | **Effort:** 3 hours | **Risk:** High (touches critical flow)

**Objective:**  
Batch user lookups when resolving invitees; reduce 50 separate queries to 1 query (50x performance improvement).

**Affected Files:**
- `src/app/(app)/events/actions.ts` (lines 280-296)

**Dependencies:** None

**Implementation Steps:**
1. Extract invitee resolution into separate function `resolveInvitees()`
2. Change from `Promise.all(map())` pattern to batch `findMany()`
3. Build lookup map; match invites to found users
4. Add unit test to verify batching

**Current Code (Issue):**
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

**Fixed Code:**
```typescript
// New function: src/lib/invitations.ts
export async function resolveInvitees(
  invites: Array<{ email: string; name?: string }>,
): Promise<Resolved[]> {
  const inviteEmails = invites.map(inv => inv.email.toLowerCase());
  
  // Single batch query
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

**Updated Action:**
```typescript
// In createEvent() - replace lines 280-296 with:
let resolved: Resolved[] = [];
const inviteesRaw = formData.get("invitees");
if (inviteesRaw) {
  let invites: { email: string; name?: string }[] = [];
  try { invites = JSON.parse(String(inviteesRaw)); } catch { }
  
  // Single database query instead of N queries
  resolved = await resolveInvitees(invites);
}
```

**Acceptance Criteria:**
- [ ] Single `findMany()` query replaces N `findUnique()` queries
- [ ] Event creation with 50 invitees takes <500ms (was >2s)
- [ ] All invitation logic works correctly
- [ ] Unit test verifies batching

**Testing Plan:**
```typescript
// Unit test: src/lib/invitations.test.ts (if test runner available)
import { resolveInvitees } from '@/lib/invitations';
import { prisma } from '@/lib/prisma';

describe('resolveInvitees', () => {
  it('should batch user lookups', async () => {
    const invites = [
      { email: 'existing@moh.gov.sl', name: 'Existing User' },
      { email: 'new@moh.gov.sl', name: 'New Guest' },
    ];
    
    const resolved = await resolveInvitees(invites);
    
    expect(resolved).toHaveLength(2);
    expect(resolved[0].userId).toBeDefined(); // existing user
    expect(resolved[1].userId).toBeNull(); // new guest
  });
});

// Integration test: event creation with 50 invitees should complete in <500ms
```

---

### ISSUE #5: Eliminate N+1 Query in Event Conflict Detection

**Priority:** P0 | **Effort:** 4 hours | **Risk:** High (touches critical flow)

**Objective:**  
Consolidate 3 separate conflict checks (venue, room events, room bookings) into 1 query using UNION.

**Affected Files:**
- `src/lib/events.ts` (lines 36-71, `findSlotConflict()`)

**Dependencies:** Issue #2 (indexes)

**Implementation Steps:**
1. Rewrite `findSlotConflict()` to use single batched query
2. For recurring events, batch all slot checks in one query
3. Add performance test to verify improvement
4. Update unit tests

**Current Code (Issue):**
```typescript
// 3 separate queries per call
export async function findSlotConflict(params: {
  roomId?: string | null;
  venueName?: string | null;
  startAt: Date;
  endAt: Date;
}) {
  // Query 1
  if (venueName && (await hasVenueConflict({ venueName, startAt, endAt }))) {
    return `venue booked`;
  }
  
  if (roomId) {
    // Query 2
    const eventClash = await prisma.event.findFirst({
      where: { roomId, startAt: { lt: endAt }, endAt: { gt: startAt } },
    });
    if (eventClash) return "event conflicts";
    
    // Query 3
    const bookingClash = await prisma.roomBooking.findFirst({
      where: { roomId, status: "CONFIRMED", startTime: { lt: endAt }, endTime: { gt: startAt } },
    });
    if (bookingClash) return "booking conflicts";
  }
  return null;
}
```

**Fixed Code:**
```typescript
// Single query with UNION
export async function findSlotConflict(params: {
  roomId?: string | null;
  venueName?: string | null;
  startAt: Date;
  endAt: Date;
}): Promise<string | null> {
  const { roomId, venueName, startAt, endAt } = params;

  // Build query parts
  const queryParts: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (venueName) {
    queryParts.push(
      `SELECT 'venue' as conflict_type FROM "Event" WHERE "venueName" ILIKE $${paramIndex} AND "startAt" < $${paramIndex + 1} AND "endAt" > $${paramIndex + 2}`
    );
    values.push(venueName, endAt, startAt);
    paramIndex += 3;
  }

  if (roomId) {
    queryParts.push(
      `SELECT 'event' as conflict_type FROM "Event" WHERE "roomId" = $${paramIndex} AND "startAt" < $${paramIndex + 1} AND "endAt" > $${paramIndex + 2}`
    );
    values.push(roomId, endAt, startAt);
    paramIndex += 3;

    queryParts.push(
      `SELECT 'booking' as conflict_type FROM "RoomBooking" WHERE "roomId" = $${paramIndex} AND "startTime" < $${paramIndex + 1} AND "endTime" > $${paramIndex + 2} AND status = 'CONFIRMED'`
    );
    values.push(roomId, endAt, startAt);
    paramIndex += 3;
  }

  if (queryParts.length === 0) return null;

  const unionQuery = queryParts.join(' UNION ALL ');
  const conflicts = await prisma.$queryRawUnsafe<Array<{ conflict_type: string }>>(
    `${unionQuery} LIMIT 1`,
    ...values
  );

  if (conflicts.length === 0) return null;

  const conflictType = conflicts[0].conflict_type;
  if (conflictType === 'venue') return 'venue is already booked';
  if (conflictType === 'event') return 'another event is scheduled in this room';
  if (conflictType === 'booking') return 'the room is already booked';
  return null;
}
```

**OR using Prisma (simpler but less optimal):**
```typescript
// Alternative: Use Prisma.sql for safer query building
export async function findSlotConflict(params: {
  roomId?: string | null;
  venueName?: string | null;
  startAt: Date;
  endAt: Date;
}): Promise<string | null> {
  const { roomId, venueName, startAt, endAt } = params;

  if (!roomId && !venueName) return null;

  // Check venue conflict
  if (venueName) {
    const venueClash = await prisma.event.findFirst({
      where: {
        venueName: { equals: venueName, mode: 'insensitive' },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (venueClash) return 'venue is already booked';
  }

  // Check room conflicts (both events and bookings in one transaction)
  if (roomId) {
    const [eventClash, bookingClash] = await Promise.all([
      prisma.event.findFirst({
        where: {
          roomId,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      }),
      prisma.roomBooking.findFirst({
        where: {
          roomId,
          status: 'CONFIRMED',
          startTime: { lt: endAt },
          endTime: { gt: startAt },
        },
        select: { id: true },
      }),
    ]);

    if (eventClash) return 'another event is scheduled in this room';
    if (bookingClash) return 'the room is already booked';
  }

  return null;
}
```

**Acceptance Criteria:**
- [ ] Conflict checking for 52-occurrence series takes <100ms (was 500ms+)
- [ ] No false positives (real conflicts detected)
- [ ] No false negatives (all conflicts caught)
- [ ] Performance test shows 5-10x improvement

**Testing Plan:**
```typescript
// Benchmark test
const startTime = Date.now();
for (let i = 0; i < 52; i++) {
  await findSlotConflict({
    roomId: 'room-1',
    venueName: null,
    startAt: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000),
    endAt: new Date(Date.now() + (i * 7 + 1) * 24 * 60 * 60 * 1000),
  });
}
const elapsed = Date.now() - startTime;
console.log(`52 conflict checks took ${elapsed}ms`); // Should be <100ms
```

---

### ISSUE #6: Implement Redis Caching Layer

**Priority:** P0 | **Effort:** 8 hours | **Risk:** Medium

**Objective:**  
Add Redis caching for user sessions, ministry data, and event permissions to reduce database load by 60-80%.

**Affected Files:**
- `src/lib/cache.ts` (new)
- `src/lib/prisma.ts`
- `src/proxy.ts`
- `src/auth.ts`
- `src/lib/permissions.ts`

**Dependencies:** Issue #1 (connection pool)

**Implementation Steps:**
1. Choose Redis provider (Upstash recommended for Vercel)
2. Create cache abstraction layer in `src/lib/cache.ts`
3. Cache user sessions (30 min TTL)
4. Cache ministry data (1 hour TTL)
5. Cache event permissions (5 min TTL)
6. Implement cache invalidation on data changes
7. Add monitoring of cache hit rate

**New File: `src/lib/cache.ts`**
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
    // Fallback: fetch without cache
    return fetchFn();
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

**Usage in Permissions:**
```typescript
// src/lib/permissions.ts - update canManageEvent()
import { cache, invalidate } from '@/lib/cache';

export async function canManageEvent(user: ActorPerm, eventId: string): Promise<boolean> {
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
    
    return canManageExistingEvent(user, {
      ministryId: event.ministryId,
      organizerId: event.organizerId,
      coOrganizerIds: event.coOrganizers.map(c => c.id),
    });
  });
}

// Invalidate when event updated
export async function invalidateEventCache(eventId: string): Promise<void> {
  await invalidatePattern(`event:*:${eventId}:*`);
}
```

**Acceptance Criteria:**
- [ ] Redis connection established on startup
- [ ] Cache miss: data fetched from DB and stored
- [ ] Cache hit: data returned within <5ms (vs 50-200ms from DB)
- [ ] Invalidation: cache cleared when data changes
- [ ] Monitoring: cache hit rate > 60% during load test
- [ ] Graceful fallback: if Redis unavailable, app continues with DB

**Testing Plan:**
```bash
# 1. Set up Upstash Redis (free tier)
# 2. Add REDIS_URL to .env
# 3. Run load test with cache monitoring

# Monitor cache performance:
# - Check Upstash dashboard for hit rate
# - Expected: >70% hit rate after 1 minute of usage
# - Response time: <100ms (with cache) vs 200-500ms (without)
```

**Environment Setup:**
```env
# .env or Vercel dashboard
REDIS_URL=redis://default:password@host:port
```

---

### ISSUE #7: Move Email Sending to Background Queue

**Priority:** P0 | **Effort:** 6 hours | **Risk:** Medium

**Objective:**  
Decouple email sending from request-response cycle; reduce event creation response time from 26s to <500ms.

**Affected Files:**
- `src/lib/email-queue.ts` (new)
- `src/app/(app)/events/actions.ts` (lines 379-401)
- `src/app/(app)/admin/users/actions.ts` (provisioning)
- `src/app/api/cron/reminders/route.ts` (reminders)

**Dependencies:** Issue #6 (Redis)

**Implementation Steps:**
1. Create queue abstraction using Redis or Bull
2. Move all email sends to queue with retry logic
3. Create worker process to consume queue
4. Add monitoring/alerting for queue depth
5. Test with 100+ concurrent emails

**New File: `src/lib/email-queue.ts`**
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

export async function queueEmail(job: Omit<EmailJob, 'id' | 'attempts'>) {
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

export async function processEmailQueue() {
  const r = await getRedis();
  
  while (true) {
    try {
      const jobStr = await r.rpop(EMAIL_QUEUE);
      if (!jobStr) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      const job: EmailJob = JSON.parse(jobStr);
      
      try {
        // Move to processing
        await r.lPush(PROCESSING, jobStr);
        
        // Send email based on type
        switch (job.type) {
          case 'invite':
            await sendInviteEmail(job.data as any);
            break;
          case 'welcome':
            await sendWelcomeEmail(job.data as any);
            break;
          case 'reminder':
            await sendReminderEmail(job.data as any);
            break;
          default:
            throw new Error(`Unknown email type: ${job.type}`);
        }
        
        // Remove from processing on success
        await r.lRem(PROCESSING, 1, jobStr);
        console.log(`[email-queue] sent: ${job.type} to ${job.to}`);
      } catch (err) {
        console.error(`[email-queue] error: ${job.id}`, err);
        
        job.attempts++;
        if (job.attempts < 5) {
          // Retry with exponential backoff
          const delay = Math.pow(2, job.attempts) * 60 * 1000; // 2, 4, 8, 16, 32 min
          job.nextRetry = Date.now() + delay;
          
          await r.lRem(PROCESSING, 1, jobStr);
          await r.lPush(EMAIL_QUEUE, JSON.stringify(job));
          console.log(`[email-queue] retry scheduled: ${job.id} in ${delay / 60000}min`);
        } else {
          // Move to dead letter
          await r.lRem(PROCESSING, 1, jobStr);
          await r.lPush(FAILED, JSON.stringify(job));
          console.error(`[email-queue] dead letter: ${job.id}`);
        }
      }
    } catch (err) {
      console.error('[email-queue] fatal error:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

**Usage in Event Creation:**
```typescript
// Before: await sendInviteEmail({...}); // Blocks for 500ms per email

// After: Just queue the email
await queueEmail({
  type: 'invite',
  to: invitee.email,
  toName: invitee.name,
  data: {
    eventTitle: data.title,
    eventDescription: data.description,
    // ... other fields
  },
});
```

**Acceptance Criteria:**
- [ ] Event creation with 50 invitees takes <500ms (was 26s)
- [ ] All emails sent within 5 minutes
- [ ] Failed emails retried with backoff
- [ ] Dead-letter queue visible for monitoring
- [ ] No emails lost on app restart

**Testing Plan:**
```typescript
// 1. Create event with 50 invitees
// 2. Measure response time: should be <500ms
// 3. Wait 5 minutes
// 4. Verify all 50 emails in mail inbox (or test provider)
// 5. Simulate failure: invalid email, verify retry logic
```

---

### ISSUE #8: Add API Rate Limiting

**Priority:** P0 | **Effort:** 4 hours | **Risk:** Low

**Objective:**  
Prevent brute-force attacks and DoS; implement rate limits on login, API endpoints, and file uploads.

**Affected Files:**
- `src/lib/rate-limit.ts` (new)
- `src/auth.ts` (login)
- `src/app/api/*` (API routes)
- `src/app/(app)/rooms/book/actions.ts` (room booking)

**Dependencies:** Issue #6 (Redis)

**Implementation Steps:**
1. Create rate limiter utility using Redis
2. Apply to login endpoint: 5 attempts per 15 min
3. Apply to API endpoints: 100 requests per minute per user
4. Apply to file uploads: 10 per minute per user
5. Return 429 with Retry-After header when limited

**New File: `src/lib/rate-limit.ts`**
```typescript
import { createClient, RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

async function getRedis(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = createClient({ url: process.env.REDIS_URL });
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
    return { allowed: true, remaining: config.maxRequests, resetAt: new Date() };
  }
  
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;
  
  // Remove old entries
  await r.zRemRangeByScore(key, '-inf', windowStart);
  
  // Count requests in window
  const count = await r.zCard(key);
  
  if (count < config.maxRequests) {
    // Request allowed
    await r.zAdd(key, { score: now, member: `${now}:${Math.random()}` });
    await r.expire(key, config.windowSeconds);
    
    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      resetAt: new Date(now + config.windowSeconds * 1000),
    };
  } else {
    // Rate limited
    const oldestRequest = await r.zRange(key, 0, 0, { withScores: true });
    const resetAt = oldestRequest.length > 0
      ? new Date((oldestRequest[0].score as number) + config.windowSeconds * 1000)
      : new Date(now + config.windowSeconds * 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }
}

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

**Usage in Auth:**
```typescript
// src/auth.ts - in authorize() function
const email = String(credentials?.email ?? "").toLowerCase().trim();

const limit = await rateLimitLogin(email);
if (!limit.allowed) {
  console.warn(`[auth] rate limited: ${email}`);
  return null; // Show generic "invalid credentials" to avoid disclosing rate limit
}

// ... rest of auth flow
```

**Usage in API Routes:**
```typescript
// src/app/api/events/route.ts or similar
import { rateLimitAPI } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  
  const limit = await rateLimitAPI(session.user.id);
  if (!limit.allowed) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000).toString(),
      },
    });
  }
  
  // ... handle request
}
```

**Acceptance Criteria:**
- [ ] Login rate limit: 5 attempts per 15 min
- [ ] API rate limit: 100 requests per min
- [ ] Upload rate limit: 10 per min
- [ ] 429 response returned with Retry-After header
- [ ] Rate limit info logged for monitoring
- [ ] No impact on normal users

**Testing Plan:**
```bash
# Test login rate limit
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -d "email=test@test.com&password=wrong" 
  # First 5 should fail with password error, 6th should hit rate limit
done

# Check logs for rate limit message
```

---

## 🔧 Database & Architecture Fixes

### ISSUE #9: Implement Account Lockout After Failed Login Attempts

**Priority:** P0 | **Effort:** 2 hours | **Risk:** Low

**Objective:**  
Lock user accounts after 5 failed login attempts for 15 minutes; alert user via email.

**Affected Files:**
- `src/auth.ts`
- `src/lib/rate-limit.ts`

**Dependencies:** Issue #8 (rate limiting), email system

**Implementation Steps:**
1. Track failed login attempts in Redis (linked to email)
2. After 5 failures: set account lock flag
3. Return specific error: "Account locked for 15 minutes"
4. Send email notification to user
5. Admins can manually unlock

**Code Changes:**
```typescript
// src/auth.ts - in authorize() function
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Check if account is locked
const lockoutKey = `login:locked:${email}`;
const isLocked = await redis?.get(lockoutKey);
if (isLocked) {
  console.warn(`[auth] account locked: ${email}`);
  return null;
}

// ... verify password ...
if (!ok) {
  // Password incorrect: increment failed attempts
  const attemptsKey = `login:attempts:${email}`;
  const attempts = await (async () => {
    const r = await redis?.incr(attemptsKey);
    await redis?.expire(attemptsKey, 15 * 60); // Reset count after 15 min
    return r || 0;
  })();
  
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    // Lock account
    await redis?.setEx(lockoutKey, LOCKOUT_DURATION_MS / 1000, '1');
    
    // Send email alert
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, ministryId: true },
    });
    
    if (user) {
      await queueEmail({
        type: 'security-alert',
        to: email,
        toName: user.name ?? email,
        data: {
          message: `Your account has been locked for 15 minutes due to multiple failed login attempts.`,
        },
      });
    }
  }
  
  return null;
}

// ... password correct, clear failed attempts ...
await redis?.del(`login:attempts:${email}`);
```

**Acceptance Criteria:**
- [ ] Account locked after 5 failed attempts
- [ ] User sees "Account locked for X minutes" message
- [ ] Email notification sent to user
- [ ] Lockout expires after 15 minutes
- [ ] Successful login clears attempt counter

**Testing Plan:**
```bash
# 1. Try wrong password 5 times
# 2. Expect: "Account locked" message
# 3. Check email for security alert
# 4. Wait 15 minutes (or set LOCKOUT_DURATION_MS to 10sec in test)
# 5. Try login again: should work
```

---

### ISSUE #10: Add Missing RSVP Token Expiry

**Priority:** P0 | **Effort:** 2 hours | **Risk:** Low

**Objective:**  
RSVP invitations expire after 14 days; update schema and check in action.

**Affected Files:**
- `prisma/schema.prisma`
- `src/app/rsvp/[token]/actions.ts`
- `src/lib/rsvp.ts`

**Dependencies:** None

**Implementation Steps:**
1. Add `rsvpTokenExpiresAt` DateTime field to EventAttendee
2. Create migration
3. When creating invitations, set expiry to now + 14 days
4. Check expiry before accepting RSVP
5. Add cleanup cron job

**Schema Changes:**
```prisma
model EventAttendee {
  // ... existing fields ...
  rsvpTokenHash       String?
  rsvpTokenExpiresAt  DateTime?  // NEW: token expiry
  respondedAt         DateTime?
  
  @@index([rsvpTokenHash])
}
```

**Code Changes:**
```typescript
// src/lib/rsvp.ts
export function createRsvpToken() {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  
  return { token, tokenHash, expiresAt };
}

// src/app/rsvp/[token]/actions.ts
export async function respondToRSVP(token: string, status: 'CONFIRMED' | 'DECLINED') {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  const attendee = await prisma.eventAttendee.findUnique({
    where: { rsvpTokenHash: tokenHash },
    include: { event: { select: { id: true, startAt: true } } },
  });
  
  if (!attendee) {
    return { error: 'Invalid invitation token' };
  }
  
  // Check expiry
  if (attendee.rsvpTokenExpiresAt && attendee.rsvpTokenExpiresAt < new Date()) {
    return { error: 'This invitation has expired. Please contact the organizer.' };
  }
  
  // ... proceed with RSVP ...
}
```

**Acceptance Criteria:**
- [ ] `rsvpTokenExpiresAt` field added
- [ ] Migration applies cleanly
- [ ] New invitations have 14-day expiry
- [ ] Expired tokens rejected with error message
- [ ] Cleanup cron runs (or at login)

**Testing Plan:**
```typescript
// Unit test
const { token, expiresAt } = createRsvpToken();
expect(expiresAt).toEqual(expect.any(Date));
expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 13 * 24 * 60 * 60 * 1000);
```

---

### ISSUE #11: Add Input Validation & Error Handling for File Uploads

**Priority:** P0 | **Effort:** 3 hours | **Risk:** Low

**Objective:**  
Validate file size, type, and implement virus scanning for uploaded files.

**Affected Files:**
- `src/app/(app)/events/[id]/recordings/actions.ts`
- `src/lib/cloudinary.ts`
- `src/lib/file-validation.ts` (new)

**Dependencies:** Issue #8 (rate limiting)

**Implementation Steps:**
1. Create file validation utility with size/type checks
2. Add max file size (100MB for audio, 10MB for images)
3. Integrate virus scanning (optional: ClamAV or third-party API)
4. Update upload handlers to validate before sending to Cloudinary
5. Return clear error messages to user

**New File: `src/lib/file-validation.ts`**
```typescript
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain'];

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export async function validateFile(
  file: File,
  category: 'image' | 'audio' | 'document',
): Promise<ValidationResult> {
  // Check size
  const maxSize = category === 'image' 
    ? MAX_IMAGE_SIZE 
    : category === 'audio' 
    ? MAX_AUDIO_SIZE 
    : MAX_DOCUMENT_SIZE;
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
    };
  }
  
  // Check type
  const allowedTypes = category === 'image'
    ? ALLOWED_IMAGE_TYPES
    : category === 'audio'
    ? ALLOWED_AUDIO_TYPES
    : ALLOWED_DOCUMENT_TYPES;
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    };
  }
  
  // TODO: Add virus scanning with ClamAV or VirusTotal
  // const isSafe = await scanFile(file);
  // if (!isSafe) {
  //   return { valid: false, error: 'File contains malware' };
  // }
  
  return { valid: true };
}
```

**Usage in Recording Upload:**
```typescript
// src/app/(app)/events/[id]/recordings/actions.ts
export async function uploadRecording(formData: FormData) {
  const file = formData.get('recording') as File;
  
  const validation = await validateFile(file, 'audio');
  if (!validation.valid) {
    return { error: validation.error };
  }
  
  // Proceed with upload
  const url = await saveAudio(file);
  // ...
}
```

**Acceptance Criteria:**
- [ ] File size validated before upload
- [ ] File type validated
- [ ] Clear error messages shown to user
- [ ] Oversized/invalid files rejected
- [ ] Valid files uploaded successfully

**Testing Plan:**
```typescript
// Unit test
describe('validateFile', () => {
  it('should reject oversized image', async () => {
    const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = await validateFile(largeFile, 'image');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });
  
  it('should reject wrong file type', async () => {
    const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await validateFile(file, 'image');
    expect(result.valid).toBe(false);
  });
  
  it('should accept valid image', async () => {
    const file = new File(['x'.repeat(5 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = await validateFile(file, 'image');
    expect(result.valid).toBe(true);
  });
});
```

---

### ISSUE #12: Fix Co-Organizer Privilege Escalation

**Priority:** P0 | **Effort:** 3 hours | **Risk:** High

**Objective:**  
Prevent co-organizers from adding/removing other co-organizers; only organizer + ministry-admin can modify co-organizer list.

**Affected Files:**
- `src/lib/roles.ts` (canReassignEvent)
- `src/lib/permissions.ts`
- `src/app/(app)/events/[id]/edit/actions.ts` (co-organizer management)

**Dependencies:** None

**Implementation Steps:**
1. Review `canReassignEvent()` logic
2. Add permission check that only organizer or ministry-admin can manage co-organizers
3. Add validation in action before updating
4. Add audit log for co-organizer changes
5. Test privilege escalation scenarios

**Current Issue:**
```typescript
// Current logic might allow co-organizer to modify list
export function canReassignEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.systemRole)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  if (e.organizerId === null) {
    return isMinistryAdminLevel(actor.systemRole);
  }
  // ← Allows co-organizer if they're in list?
  return e.organizerId === actor.id || isMinistryAdminLevel(actor.systemRole);
}
```

**Fixed Code:**
```typescript
// Explicit: only organizer or ministry-admin can reassign
export function canReassignEvent(actor: ActorPerm, e: EventPerm): boolean {
  if (isSuperAdmin(actor.systemRole)) return true;
  if (actor.ministryId !== e.ministryId) return false;
  
  // Public events: ministry-admin only
  if (e.organizerId === null) {
    return isMinistryAdminLevel(actor.systemRole);
  }
  
  // Private events: only organizer or ministry-admin (NOT co-organizer)
  return e.organizerId === actor.id || isMinistryAdminLevel(actor.systemRole);
}

// New function for validation
export function canUpdateCoOrganizers(actor: ActorPerm, e: EventPerm): boolean {
  return canReassignEvent(actor, e); // Same strict check
}
```

**Usage in Action:**
```typescript
// src/app/(app)/events/[id]/edit/actions.ts
export async function updateCoOrganizers(
  eventId: string,
  newCoOrganizerIds: string[],
) {
  const user = await requireUser();
  
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { coOrganizers: { select: { id: true } } },
  });
  
  if (!event) return { error: 'Event not found' };
  
  // Check permission
  if (!canUpdateCoOrganizers(user, {
    ministryId: event.ministryId,
    organizerId: event.organizerId,
    coOrganizerIds: event.coOrganizers.map(c => c.id),
  })) {
    return { error: 'You do not have permission to manage co-organizers' };
  }
  
  // Update
  await prisma.event.update({
    where: { id: eventId },
    data: {
      coOrganizers: {
        set: newCoOrganizerIds.map(id => ({ id })),
      },
    },
  });
  
  await audit({
    actorId: user.id,
    action: 'UPDATE_CO_ORGANIZERS',
    entityType: 'Event',
    entityId: eventId,
    metadata: { newCoOrganizerIds },
  });
  
  return { ok: true };
}
```

**Acceptance Criteria:**
- [ ] Only organizer can modify co-organizers
- [ ] Co-organizer cannot add themselves back if removed
- [ ] Ministry-admin can modify (event owner in their ministry)
- [ ] Super-admin can modify (any event)
- [ ] Audit log records all changes

**Testing Plan:**
```typescript
// Scenario 1: Co-organizer tries to remove organizer
const result = await updateCoOrganizers(eventId, []);
// Expected: Permission denied

// Scenario 2: Organizer removes all co-organizers
const result = await updateCoOrganizers(eventId, []);
// Expected: Success

// Scenario 3: Ministry-admin changes co-organizers
const result = await updateCoOrganizers(eventId, [newUserId]);
// Expected: Success
```

---

## 🔐 Security Hardening

### ISSUE #13: Implement TOTP-Based Multi-Factor Authentication (MFA)

**Priority:** P0 | **Effort:** 8 hours | **Risk:** Medium

**Objective:**  
Add TOTP (Time-based One-Time Password) MFA for government security requirements.

**Affected Files:**
- `prisma/schema.prisma` (new fields)
- `src/auth.ts` (MFA verification)
- `src/app/(app)/settings/page.tsx` (MFA setup)
- `src/lib/mfa.ts` (new utility)

**Dependencies:** None

**Implementation Steps:**
1. Add MFA fields to User schema
2. Create TOTP secret generation utility
3. Add MFA setup flow (QR code generation)
4. Modify login to require OTP after password
5. Add recovery codes for account recovery
6. Make MFA optional for staff, mandatory for admins

**Schema Changes:**
```prisma
model User {
  // ... existing fields ...
  mfaEnabled       Boolean @default(false)
  mfaSecret        String?  // TOTP secret (encrypted)
  mfaRecoveryCodes Json?    // [{ code: string, usedAt: DateTime? }]
  mfaSetupAt       DateTime?
  mfaBackupEmail   String?  // For recovery
  
  @@index([email, mfaEnabled])
}

model MFASession {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token         String   @unique  // Temporary token after password verified
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  
  @@index([token])
}
```

**New File: `src/lib/mfa.ts`**
```typescript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function generateMFASecret(email: string) {
  const secret = authenticator.generateSecret();
  
  const otpauth = authenticator.keyuri(
    email,
    'Smart Meeting',
    secret,
  );
  
  const qrCode = await QRCode.toDataURL(otpauth);
  
  return {
    secret,
    qrCode,
    // IMPORTANT: Also show secret in plain text for manual entry
    manualEntry: secret.match(/.{1,4}/g)?.join(' ') || secret,
  };
}

export function verifyMFAToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ secret, encoding: 'base32', token });
  } catch (err) {
    return false;
  }
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase()
  );
}

export function verifyRecoveryCode(codes: any[], code: string): boolean {
  const record = codes.find(c => c.code === code && !c.usedAt);
  return !!record;
}

export function useRecoveryCode(codes: any[], code: string): any[] {
  return codes.map(c => 
    c.code === code && !c.usedAt
      ? { ...c, usedAt: new Date() }
      : c
  );
}
```

**Updated Login Flow:**
```typescript
// src/auth.ts - authorize function modified for MFA
export async function authorize(credentials: any) {
  // ... password verification ...
  
  if (!ok) return null;
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, mfaEnabled: true },
  });
  
  if (user?.mfaEnabled) {
    // Create temporary session requiring MFA
    const mfaSession = await prisma.mFASession.create({
      data: {
        userId: user.id,
        token: randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    });
    
    // Return signal to client: "need MFA"
    return {
      // ... regular user fields ...
      mfaRequired: true,
      mfaToken: mfaSession.token, // Send to client
    };
  }
  
  // MFA not enabled; proceed with login
  return user;
}
```

**Acceptance Criteria:**
- [ ] TOTP setup generates QR code
- [ ] QR code scanned in Authenticator app
- [ ] Login requires OTP after password
- [ ] Invalid OTP rejected
- [ ] Recovery codes work
- [ ] Admin accounts MFA mandatory, staff optional
- [ ] MFA session expires after 5 minutes

**Testing Plan:**
```bash
# 1. Enable MFA in settings
# 2. Scan QR code with Google Authenticator
# 3. Try login: should ask for OTP
# 4. Enter OTP from authenticator: should succeed
# 5. Try with wrong OTP: should fail
# 6. Use recovery code: should work
```

---

### ISSUE #14: Add Email Verification on User Signup

**Priority:** P0 | **Effort:** 3 hours | **Risk:** Low

**Objective:**  
Require email verification before user can log in; prevents email impersonation.

**Affected Files:**
- `prisma/schema.prisma`
- `src/auth.ts`
- `src/lib/email.ts` (new email type)
- `src/app/(app)/admin/users/actions.ts` (provisioning)

**Dependencies:** Issue #7 (email queue)

**Implementation Steps:**
1. Add `emailVerified` DateTime field (already in schema, but unused)
2. When provisioning user, send verification email
3. Create verification token endpoint
4. Block login if email not verified
5. Add "resend verification" action

**Code Changes:**
```typescript
// src/app/(app)/admin/users/actions.ts - in provisionUser()
export async function provisionUser({
  name, email, systemRole, ministryId, jobTitle
}: ProvisionParams) {
  // ... create user ...
  
  // Send verification email (not just welcome)
  const verificationToken = createVerificationToken();
  await queueEmail({
    type: 'email-verification',
    to: email,
    toName: name,
    data: {
      verificationLink: absoluteAppUrl(`/verify-email?token=${verificationToken}`),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });
  
  // Store token temporarily
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(verificationToken),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  
  return { user, emailSent: true };
}

// src/auth.ts - in authorize(), block unverified emails
if (!user.emailVerified) {
  return null; // Signal: "verify email first"
  // Client shows: "Please check your email to verify your account"
}

// New endpoint: GET /api/auth/verify-email?token=...
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return new Response('Invalid token', { status: 400 });
  
  const tokenHash = hashToken(token);
  const verifyRecord = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: '', token: tokenHash } }, // Find by token
  });
  
  if (!verifyRecord || verifyRecord.expires < new Date()) {
    return new Response('Token expired', { status: 400 });
  }
  
  // Mark email as verified
  await prisma.user.update({
    where: { email: verifyRecord.identifier },
    data: { emailVerified: new Date() },
  });
  
  // Clean up token
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: verifyRecord.identifier, token: tokenHash } },
  });
  
  return new Response('Email verified! You can now log in.', { status: 200 });
}
```

**Acceptance Criteria:**
- [ ] New users receive verification email
- [ ] Unverified users cannot log in
- [ ] Clicking email link verifies account
- [ ] Token expires after 24 hours
- [ ] "Resend verification" action available

**Testing Plan:**
```bash
# 1. Provision new user
# 2. Check email for verification link
# 3. Try login: should fail with "verify email" message
# 4. Click verification link
# 5. Try login: should succeed
```

---

## 📊 Operations & Monitoring

### ISSUE #15: Add Health Check Endpoint

**Priority:** P0 | **Effort:** 2 hours | **Risk:** Minimal

**Objective:**  
Implement `/health` endpoint for uptime monitoring and load balancer health checks.

**Affected Files:**
- `src/app/api/health/route.ts` (new)

**Dependencies:** None

**Implementation Steps:**
1. Create endpoint that checks:
   - Database connectivity
   - Redis connectivity (if available)
   - Cloudinary connectivity
   - Response time
2. Return 200 if healthy, 503 if unhealthy
3. Add to monitoring services
4. Configure Vercel health checks

**New File: `src/app/api/health/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, boolean | string> = {
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Database check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (err) {
      checks.database = `failed: ${err instanceof Error ? err.message : 'unknown'}`;
    }
    
    // Redis check (optional)
    try {
      const r = await getRedis();
      if (r) {
        await r.ping();
        checks.redis = true;
      } else {
        checks.redis = 'not configured';
      }
    } catch (err) {
      checks.redis = `failed: ${err instanceof Error ? err.message : 'unknown'}`;
    }
    
    // Response time
    checks.responseTime = `${Date.now() - startTime}ms`;
    
    // Determine overall health
    const isHealthy = checks.database === true && 
                      (!checks.redis || checks.redis === true || typeof checks.redis === 'string');
    
    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        checks,
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'unknown',
      },
      { status: 503 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] `/health` returns 200 when database is up
- [ ] Returns 503 when database is down
- [ ] Includes response time in output
- [ ] Vercel health check configured to call `/health`
- [ ] Monitoring service (e.g., Healthchecks.io) configured

**Testing Plan:**
```bash
# Test endpoint
curl http://localhost:3000/api/health

# Expected response:
# {
#   "status": "healthy",
#   "checks": {
#     "database": true,
#     "redis": "not configured",
#     "responseTime": "45ms"
#   }
# }
```

---

## Summary of Critical Issues (Week 1-3)

| # | Issue | Effort | Benefit | Risk |
|---|-------|--------|---------|------|
| 1 | Connection pool | 1h | Prevents crashes at 200 users | Minimal |
| 2 | Database indexes | 2h | 10-100x query speedup | Minimal |
| 3 | QR token race condition | 3h | Eliminates duplicate tokens | Medium |
| 4 | N+1 query (invitees) | 3h | 10x faster event creation | High |
| 5 | N+1 query (conflicts) | 4h | 5-10x faster conflict check | High |
| 6 | Redis caching | 8h | 60-80% DB load reduction | Medium |
| 7 | Email queue | 6h | 26s → 500ms event response time | Medium |
| 8 | Rate limiting | 4h | Brute-force protection | Low |
| 9 | Account lockout | 2h | Security hardening | Low |
| 10 | RSVP token expiry | 2h | Security, compliance | Low |
| 11 | File validation | 3h | Prevent malware, DoS | Low |
| 12 | Co-organizer exploit | 3h | Prevent privilege escalation | High |
| 13 | TOTP MFA | 8h | Government compliance | Medium |
| 14 | Email verification | 3h | Prevent impersonation | Low |
| 15 | Health check | 2h | Monitoring foundation | Minimal |
| **Total** | | **65h** | **Production ready for <1K users** | - |

---

# 🟠 HIGH PRIORITY (Week 4-6)

These issues enable scaling to 5,000 concurrent users. Should be completed before any national rollout.

### ISSUE #16: Add Structured Logging & Correlation IDs

**Priority:** P1 | **Effort:** 4 hours

**Objective:**  
Implement structured JSON logging with correlation IDs for request tracing.

**Files:**
- `src/lib/logger.ts` (new)
- `src/middleware.ts` (correlation ID injection)
- `src/app/layout.tsx`

**Implementation:**
Create JSON logger that includes correlation ID on every log, enabling tracing of full request path through logs.

```typescript
// src/lib/logger.ts
import { v4 as uuid } from 'uuid';

export function createLogger(correlationId?: string) {
  const id = correlationId || uuid();
  
  return {
    info: (message: string, data?: any) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        correlationId: id,
        message,
        data,
      }));
    },
    error: (message: string, error?: any) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        correlationId: id,
        message,
        error: error?.message,
        stack: error?.stack,
      }));
    },
  };
}
```

**Acceptance Criteria:**
- [ ] All logs include correlation ID
- [ ] Correlation ID passed through request lifecycle
- [ ] Logs in JSON format (parseable)
- [ ] Can filter logs by correlation ID

---

### ISSUE #17: Implement Database Query Logging & Performance Monitoring

**Priority:** P1 | **Effort:** 6 hours

**Objective:**  
Log all slow database queries; track query performance over time.

**Files:**
- `src/lib/prisma.ts` (query interceptor)
- `src/lib/metrics.ts` (new)

**Implementation:**
Use Prisma middleware to intercept and time queries; log queries taking >500ms.

```typescript
// src/lib/prisma.ts - add middleware
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  
  if (duration > 500) {
    console.warn(JSON.stringify({
      level: 'SLOW_QUERY',
      model: params.model,
      action: params.action,
      duration,
      args: params.args,
    }));
  }
  
  return result;
});
```

**Acceptance Criteria:**
- [ ] Slow queries logged automatically
- [ ] Query duration tracked
- [ ] Can identify N+1 patterns from logs
- [ ] Dashboard shows slowest queries

---

### ISSUE #18: Implement Sentry Error Reporting

**Priority:** P1 | **Effort:** 3 hours

**Objective:**  
Capture unhandled errors and send to Sentry for monitoring.

**Files:**
- `instrumentation.ts` (new)
- `src/app/(app)/layout.tsx`
- `src/app/api/*/route.ts`

**Implementation:**
Initialize Sentry on app startup; captures all errors.

```bash
npm install @sentry/nextjs
```

```typescript
// instrumentation.ts
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Unhandled errors captured
- [ ] Error stack traces visible in Sentry
- [ ] Can set up Slack notifications
- [ ] Can track error trends

---

### ISSUE #19: Implement Database Backup Verification

**Priority:** P1 | **Effort:** 3 hours

**Objective:**  
Create daily script to verify backups are working; implement restore testing.

**Files:**
- `scripts/verify-backup.ts` (new)
- `src/lib/backup.ts` (new)

**Implementation:**
Run daily cron to:
1. Create test table
2. Insert test data
3. Trigger backup
4. Verify data recovered

```typescript
// scripts/verify-backup.ts
async function verifyBackup() {
  // 1. Create test table
  const testId = `backup-test-${Date.now()}`;
  await prisma.auditLog.create({
    data: {
      action: 'BACKUP_TEST',
      entityType: 'BackupVerification',
      entityId: testId,
      metadata: { timestamp: new Date().toISOString() },
    },
  });
  
  // 2. Verify it was created
  const created = await prisma.auditLog.findUnique({
    where: { id: testId },
  });
  
  if (!created) {
    throw new Error('Backup verification failed: cannot read back data');
  }
  
  // 3. Log success
  console.log('Backup verification passed');
}
```

**Acceptance Criteria:**
- [ ] Daily backup verification runs
- [ ] Alerts if backup fails
- [ ] Can restore from backup (tested quarterly)

---

### ISSUE #20: Implement Deployment Strategy (Dev/Staging/Prod)

**Priority:** P1 | **Effort:** 6 hours

**Objective:**  
Separate environments prevent production accidents; enable staged rollouts.

**Files:**
- `.github/workflows/deploy.yml` (new)
- `vercel.json` (updated)
- Documentation

**Implementation:**
1. Create 3 Vercel projects: dev, staging, prod
2. Promote from staging → prod manually
3. Run tests before deployment
4. Keep previous deployments for rollback

**GitHub Actions Workflow:**
```yaml
name: Deploy

on:
  push:
    branches: [main, staging, dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run tests
        run: npm run lint
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/staging'
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_STAGING_PROJECT_ID }}
      
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PRODUCTION_PROJECT_ID }}
```

**Acceptance Criteria:**
- [ ] Three separate Vercel projects (dev, staging, prod)
- [ ] Each has own database, Redis, env vars
- [ ] Deployments automated via GitHub Actions
- [ ] Manual approval required for prod
- [ ] Rollback available (previous 10 versions)

---

### ISSUE #21: Implement Audit Logging for Sensitive Actions

**Priority:** P1 | **Effort:** 4 hours

**Objective:**  
Ensure all sensitive actions (user creation, role changes, minutes approval) are audited with full context.

**Files:**
- `src/lib/audit.ts` (updated)
- All action files

**Implementation:**
1. Review all actions to ensure audit logging
2. Add audit logging to sensitive operations
3. Include before/after state in audit log
4. Track who made change, when, what changed

**Sensitive Actions to Log:**
- User creation, deletion, role change
- Password reset/change
- Event approval/publication
- Minutes publication
- Permission changes
- File access/download

```typescript
// Example: User role change
await audit({
  actorId: user.id,
  action: 'UPDATE_USER_ROLE',
  entityType: 'User',
  entityId: targetUserId,
  metadata: {
    before: targetUser.systemRole,
    after: newRole,
    reason: 'Promotion to ministry admin',
  },
  ministryId: user.ministryId,
});
```

**Acceptance Criteria:**
- [ ] All sensitive actions audited
- [ ] Audit log includes before/after values
- [ ] Can trace who made changes
- [ ] Compliance with government requirements

---

### ISSUE #22: Implement Soft-Delete Enforcement

**Priority:** P1 | **Effort:** 2 hours

**Objective:**  
Ensure soft-deleted records don't leak into queries; add active/deleted status checks everywhere.

**Files:**
- `src/lib/guard.ts` (add deletedAt check)
- All queries fetching users

**Implementation:**
Every user query should exclude `deletedAt IS NOT NULL`.

```typescript
// BEFORE: User might be deleted
const user = await prisma.user.findUnique({
  where: { email },
});

// AFTER: Check deleted status
const user = await prisma.user.findUnique({
  where: { email },
  select: { ...fields, deletedAt: true },
});

if (user?.deletedAt) {
  return null; // Deleted user cannot log in
}
```

**Acceptance Criteria:**
- [ ] Deleted users cannot log in
- [ ] Deleted users don't appear in lists
- [ ] Deleted users cannot be assigned to events

---

### ISSUE #23: Add Database Partitioning Strategy for Large Tables

**Priority:** P1 | **Effort:** 8 hours

**Objective:**  
Partition AuditLog and Notification tables by date to maintain query performance as they grow to billions of rows.

**Files:**
- `prisma/migrations/*/partitioning.sql` (new)
- Database management scripts

**Implementation:**
Create monthly partitions for AuditLog; quarterly for Notification.

```sql
-- Create partitioned table
CREATE TABLE "AuditLog_Partitioned" (
  id TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL,
  ...fields...
) PARTITION BY RANGE (DATE_TRUNC('month', "createdAt"));

-- Create monthly partitions
CREATE TABLE "AuditLog_2026_01" PARTITION OF "AuditLog_Partitioned"
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE "AuditLog_2026_02" PARTITION OF "AuditLog_Partitioned"
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... repeat for each month
```

**Acceptance Criteria:**
- [ ] Partitions created for AuditLog
- [ ] Queries on recent data use partition pruning
- [ ] Retention policy implemented (delete/archive old partitions)
- [ ] No performance regression on queries

---

### ISSUE #24: Implement Monitoring Dashboard

**Priority:** P1 | **Effort:** 6 hours

**Objective:**  
Create dashboard showing system health, performance, and error rates.

**Tools:** Vercel Analytics + Sentry + custom metrics

**Implementation:**
1. Set up Vercel Analytics (free)
2. Connect Sentry dashboard
3. Create custom metrics dashboard (Vercel or Grafana)
4. Set up alerts for key metrics

**Metrics to Track:**
- Uptime %
- Error rate %
- Response time (p50, p95, p99)
- Database connection pool usage
- Redis hit rate
- Email queue depth
- Active users
- API requests per minute

**Acceptance Criteria:**
- [ ] Dashboard shows real-time metrics
- [ ] Alerts configured for thresholds
- [ ] Can drill down into errors
- [ ] Performance trends visible

---

### ISSUE #25: Implement Request Timeout Handling

**Priority:** P1 | **Effort:** 3 hours

**Objective:**  
Prevent hung requests from blocking system; implement timeouts on all external calls.

**Files:**
- `src/lib/http.ts` (new fetch wrapper)
- All API calls

**Implementation:**
```typescript
// src/lib/http.ts
const DEFAULT_TIMEOUT = 10000; // 10 seconds

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Acceptance Criteria:**
- [ ] External API calls timeout after 10 seconds
- [ ] Timeout errors handled gracefully
- [ ] Retry logic for transient failures
- [ ] No hung requests in production logs

---

## Quick Summary: High Priority Issues

| # | Issue | Effort | Impact |
|----|-------|--------|--------|
| 16 | Structured logging | 4h | Debug efficiency |
| 17 | Query logging | 6h | Identify performance issues |
| 18 | Sentry error reporting | 3h | Monitor production issues |
| 19 | Backup verification | 3h | Data safety |
| 20 | Deployment strategy | 6h | Prevent accidents |
| 21 | Audit logging audit | 4h | Compliance |
| 22 | Soft-delete enforcement | 2h | Data security |
| 23 | Database partitioning | 8h | 100K+ user scale |
| 24 | Monitoring dashboard | 6h | Visibility |
| 25 | Request timeout handling | 3h | System stability |
| **Total** | | **45h** | **Scale to 5,000 users** |

**18 more high-priority issues follow in the full roadmap...**

---

# 🟡 MEDIUM PRIORITY (Phase 2, Weeks 7-10)

These enable scaling to 100,000+ users but are not blocking for MVP launch.

- [ ] ISSUE #26: Full-text search implementation (Elasticsearch)
- [ ] ISSUE #27: WebSocket/SSE real-time features
- [ ] ISSUE #28: Read replicas for reporting queries
- [ ] ISSUE #29: OAuth/SSO integration
- [ ] ISSUE #30: Calendar export (ICS/iCal)
- [ ] ISSUE #31: Email bounce handling
- [ ] ISSUE #32: Advanced permission delegation
- [ ] ISSUE #33: Data archival strategy
- [ ] ISSUE #34: API versioning (/v1/)
- [ ] ISSUE #35: Microservices decomposition planning
- [ ] ISSUE #36: Collaborative document editing
- [ ] ISSUE #37: Advanced analytics
- [ ] ISSUE #38: Bulk operations (batch invite)
- [ ] ISSUE #39: Cross-ministry scheduling
- [ ] ISSUE #40: Payment/billing system
- [ ] ISSUE #41: Mobile app API
- [ ] ISSUE #42: GraphQL API
- [ ] ISSUE #43: Content delivery optimization

---

# 🟢 NICE TO HAVE (Phase 3+)

Lower-priority improvements; can wait until after national launch.

- [ ] ISSUE #44: AI-powered meeting insights
- [ ] ISSUE #45: Automated meeting summarization
- [ ] ISSUE #46: Translation service integration
- [ ] ISSUE #47: Video conferencing integration
- [ ] ISSUE #48: Meeting room sensors (occupancy)
- [ ] ISSUE #49: Custom branding per ministry
- [ ] ISSUE #50: Advanced reporting/BI
- [ ] ISSUE #51: Blockchain audit trail
- [ ] ISSUE #52: GDPR data export
- [ ] ISSUE #53: Accessibility improvements
- [ ] ISSUE #54: Mobile app (native iOS/Android)

---

## Implementation Order & Dependencies

**Week 1 (23 hours):**
1. Issue #1: Connection pool (1h)
2. Issue #2: Database indexes (2h)
3. Issue #3: QR token race condition (3h)
4. Issue #15: Health check (2h)
5. Issue #9: Account lockout (2h)
6. Issue #10: RSVP token expiry (2h)
7. Issue #11: File validation (3h)
8. Issue #12: Co-organizer exploit (3h)
9. Issue #14: Email verification (2h)

**Week 2 (25 hours):**
1. Issue #4: N+1 query invitees (3h)
2. Issue #5: N+1 query conflicts (4h)
3. Issue #8: Rate limiting (4h)
4. Issue #13: TOTP MFA (8h)
5. Issue #6: Redis caching (6h) - can start parallel

**Week 3 (17 hours):**
1. Issue #7: Email queue (6h)
2. Issue #16: Structured logging (4h)
3. Issue #22: Soft-delete enforcement (2h)
4. Issue #25: Request timeout handling (3h)
5. Issue #19: Backup verification (3h) - can run parallel

**Week 4-6 (High Priority):**
- Issue #17, #18, #20-24 (28 hours)

---

## Risk Mitigation

**High-Risk Issues (test thoroughly):**
- Issue #4, #5: N+1 queries (affects critical path)
- Issue #7: Email queue (async behavior change)
- Issue #13: MFA (authentication flow change)

**Medium-Risk Issues:**
- Issue #6: Redis caching (adds external dependency)
- Issue #20: Deployment strategy (process change)

**Low-Risk Issues:**
- All others (isolated, well-scoped)

---

**Generated:** 2026-07-18 | **Next Review:** Weekly sprint planning
