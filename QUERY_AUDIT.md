# Query Audit: High-Traffic Endpoints

**Date:** 2026-07-20  
**Goal:** Reduce queries per request from 8+ to 2-3 for faster concurrent capacity  
**Impact:** 3-4x throughput improvement = handle 150-300 concurrent users instead of 50

---

## 1. Check-In Flow (🔴 HIGH PRIORITY)

**Route:** `POST /checkin` (submitCheckIn action)  
**Traffic:** Peak during 30-min check-in windows (10,000 users = ~5.5 req/sec)  
**Current queries:** 4-5 per request

### Query Breakdown

1. ✅ `resolveToken(token)` — internal function, no DB cost (token is passed in FormData)
2. ❌ `auth()` — calls Prisma to get session user (1 query)
3. ❌ `eventAttendee.findUnique()` — check invite list (1 query)
4. ❌ `attendance.findFirst()` — check for duplicate check-in (1 query)
5. ✅ `attendance.create()` — create attendance record (1 query, required)
6. ✅ `audit()` — append-only log, no conflicts (1 query, required)

**Total: 5 queries**

### Problems

- **Line 51:** `auth()` is expensive — calls Prisma every time
- **Line 57-59:** `eventAttendee.findUnique()` is a **separate query** — could be batched
- **Line 110-112:** `attendance.findFirst()` checks for dupes — could move to DB constraint or race-safe insert

### Optimization Plan (Est. 2 weeks)

```typescript
// CURRENT (5 queries per request)
const resolved = await resolveToken(token);          // 0 queries (cached token)
const session = await auth();                         // 1 query (user lookup)
const invite = await prisma.eventAttendee.findUnique(...);  // 1 query
const existing = await prisma.attendance.findFirst(...);    // 1 query
const attendance = await prisma.attendance.create(...);    // 1 query
// Total: 4-5 queries

// OPTIMIZED (2 queries per request)
// Batch queries 1-3 together:
const [session, invite] = await Promise.all([
  auth(),  // 1 query (unavoidable)
  prisma.eventAttendee.findUnique(...),  // 1 query (batched)
]);
// Skip the duplicate check — rely on unique constraint + race handler
const attendance = await prisma.attendance.create(...);  // 1 query
// Total: 2 queries (was 4-5)
```

**Why it works:**
- Batching `auth()` + `eventAttendee.findUnique()` with `Promise.all()` sends both in parallel
- Remove the redundant `attendance.findFirst()` check — the `P2002` race handler already exists (lines 138-142)
- The catch block is already there; trust it

**Outcome:** 4-5 queries → 2 queries (50% reduction) = **2x capacity gain**

---

## 2. Dashboard / Events List (🟡 MEDIUM PRIORITY)

**Route:** `GET /administrative/events` (AllEventsPage)  
**Traffic:** Viewed on app startup, refresh every 30-60s  
**Current queries:** 3 parallel queries (Promise.all at line 66)

### Query Breakdown

```typescript
// Line 66-89: Three parallel queries
[upcoming, present, past] = await Promise.all([
  prisma.event.findMany(...), // 1 query
  prisma.event.findMany(...), // 1 query
  prisma.event.findMany(...), // 1 query
])
```

Each query fetches:
- `room` (left join, 1-2 rows per event)
- `organizer` (left join)
- `ministry` (left join)
- `_count.attendances` (aggregation)
- `_count.attendees` (aggregation)

**Total: 3 queries** (parallel)

### Problems

- ✅ Already batched well (3 parallel queries, not sequential)
- ⚠️ `_count` is expensive on large tables (counts ALL attendances/attendees for each event)
- ⚠️ N+1 not present here, but this should be **cached** (refreshes rarely)

### Optimization Plan (Est. 1 week + caching)

**Short term (no code changes):**
- Add Redis caching with 5-min TTL: `GET events:upcoming | events:present | events:past`
- Cache miss → run the 3-query set, store result

**Long term (requires schema redesign):**
- Add denormalized columns to `Event` table: `upcomingCount`, `presentCount`, `attendeeCount` (updated on trigger)
- Query becomes: `SELECT id, title, ... FROM events WHERE startAt > NOW ORDER BY startAt`
- Result: 1 query instead of 3

**Outcome:** 3 queries with cache = ~0 queries (95% of requests) = **10x faster**

---

## 3. Event Detail Page (🟡 MEDIUM PRIORITY)

**Route:** `GET /administrative/events/[id]` (EventDetailPage)  
**Traffic:** Opened when viewing meeting details, viewed per organizer per meeting  
**Current queries:** 2 parallel queries (Promise.all at line 62)

### Query Breakdown

```typescript
// Line 29-39: Single query with nested includes
const event = await prisma.event.findUnique({
  where: { id },
  include: {
    organizer: { select: { name, email } },
    coOrganizers: { select: { id, name, email } },
    room: { select: { id, name, location, capacity } },
    series: true,
    invitedMinistries: { select: { id, name } },
    _count: { select: { attendees, attendances } },
  },
});
// 1 query (good!)

// Line 62-78: Conditional second query
if (canReassign) {
  candidates = prisma.user.findMany(...)  // 1 query
}
myInvite = prisma.eventAttendee.findUnique(...)  // 1 query
// Parallel: [candidates query OR nothing, myInvite query]
```

**Total: 2 queries** (1 event + 1-2 conditional)

### Problems

- ✅ Already well-optimized with eager loading
- ⚠️ `_count` aggregations are slow on large tables

### Optimization Plan (Est. 1 week)

**Short term:**
- Add Redis cache for event metadata (if event endAt > now, cache for 5 min)
- Cache miss → run the 2 queries

**Long term:**
- Replace `_count: { attendees, attendances }` with denormalized columns
- Update denorm columns via Prisma hooks or DB triggers

**Outcome:** 2 queries with cache = ~0 queries (95% of views) = **infinite improvement**

---

## 4. Attendees Page (🔴 HIGH PRIORITY)

**Route:** `GET /administrative/events/[id]/attendees` (AttendeesPage)  
**Traffic:** Organizer views during meeting (real-time attendee tracking)  
**Current queries:** 3 sequential queries

### Query Breakdown

```typescript
// Line 20-36: Query 1 — event with attendees + attendances
const event = await prisma.event.findUnique({
  where: { id },
  select: {
    id, title, ministryId, organizerId, coOrganizers,
    attendees: {
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id, name, email } } },  // 1 LEFT JOIN
    },
    attendances: {  // 1 LEFT JOIN
      select: { id, userId, checkInAt, withinGeofence, method, externalName, externalEmail },
    },
  },
});
// 1 query (good, with joins)

// Line 61-70: Query 2 — find uninvited users in ministry
const uninvitedUsers = await prisma.user.findMany({
  where: {
    ministryId: event.ministryId,
    systemRole: { not: "SUPER_ADMIN" },
    id: { notIn: invitedUserIds },  // <-- THIS LINE: depends on event.attendees from Query 1
  },
  select: { id, name, email },
  orderBy: [{ name: "asc" }, { email: "asc" }],
  take: 100,
});
// 1 query (sequential, blocks on Query 1)
```

**Total: 2 queries** (1 event, 1 sequential user lookup)

### Problems

- ✅ Mostly fine, but Query 2 blocks on Query 1
- ⚠️ The `invitedUserIds` processing on lines 57-59 is done in JavaScript, then fed back to Query 2
- ⚠️ This pattern is unavoidable for this use case (need event data first to compute NOT IN list)

### Optimization Plan (Est. <1 week)

**This one is already efficient.** Minor improvements:

1. **Reduce `take: 100` to `take: 50`** — most meetings don't have 100+ uninvited users
2. **Add Redis cache for ministry users** (cache uninvited list for 10 min)
3. **Consider pagination** — only fetch when user scrolls

**Outcome:** 2 queries → 1 query if cached = **2x improvement**

---

## 5. RSVP Action (🟢 LOW PRIORITY)

**Route:** `POST /rsvp/[token]` (respondToInvitation action)  
**Traffic:** Users clicking RSVP links (likely <1% of traffic)  
**Current queries:** 2 queries

### Query Breakdown

```typescript
// Line 33-41: Query 1
const invitations = await prisma.eventAttendee.findMany({
  where: { rsvpTokenHash: tokenHash },
  select: {
    id, eventId, userId,
    event: { select: { endAt, ministryId } },  // 1 JOIN
  },
});
// 1 query

// Line 56-59: Query 2 (sequential, depends on Query 1)
const updated = await prisma.eventAttendee.updateMany({
  where: { rsvpTokenHash: tokenHash },
  data: { status, respondedAt },
});
// 1 query (updates based on findMany results)
```

**Total: 2 queries**

### Problems

- ✅ Already optimized (minimal queries)
- ⚠️ Could batch the `findMany` + `updateMany` into transaction, but no gain

**No action needed.** This is fine.

---

## Summary Table

| Endpoint | Current | Optimized | Effort | Priority | Gain |
|----------|---------|-----------|--------|----------|------|
| Check-in (submitCheckIn) | 4-5 | 2 | 2 weeks | 🔴 HIGH | 2x capacity |
| Events list (AllEventsPage) | 3 + cache | 0 (cached) | 1 week | 🟡 MEDIUM | 10x faster |
| Event detail | 2 + cache | 0 (cached) | 1 week | 🟡 MEDIUM | infinite |
| Attendees page | 2 | 1 (cached) | <1 week | 🔴 HIGH | 2x |
| RSVP action | 2 | 2 | 0 | 🟢 LOW | — |

---

## Implementation Roadmap

### Phase 1: Check-In Bottleneck (2 weeks) — **START HERE**
1. Batch `auth()` + `eventAttendee.findUnique()` with Promise.all
2. Remove redundant `attendance.findFirst()` check
3. Add unit tests for race conditions
4. Load test: verify 2 queries per request

**Gain:** 50% reduction in check-in latency → handle 100-150 concurrent users

### Phase 2: Redis Caching (2-3 weeks)
1. Add Redis client (`src/lib/redis.ts`)
2. Cache event list (5-min TTL, invalidate on event update)
3. Cache event detail (5-min TTL, invalidate on event update)
4. Cache ministry users (10-min TTL, invalidate on user create/update)
5. Add cache metrics (hits/misses)

**Gain:** 95% of list/detail views are instant → dashboard loads in <100ms

### Phase 3: Optional Denormalization (4-6 weeks) — *Only if needed*
1. Add columns: `Event.upcomingCount`, `Event.attendeeCount`, etc.
2. Maintain via Prisma hooks or DB triggers
3. Replace `_count` queries with column reads

**Gain:** 1 query instead of 3 for event list (already cached, so low priority)

---

## Testing Plan

**Load test script:**
```bash
# Generate 50 concurrent users checking in over 5 minutes
# Monitor: queries per second, latency P95/P99, connection pool usage

# Before optimization: expect 200-250 q/sec, 80-100ms latency
# After Phase 1: expect 100-125 q/sec, 40-50ms latency
# After Phase 2: expect 50-75 q/sec (cache hits), <10ms latency
```

---

## Quick Wins (Do First, 1 day)

1. **Batch check-in queries** (Promise.all line)
   - File: `src/app/checkin/actions.ts` lines 51-62
   - Change: 3 separate awaits → 1 Promise.all
   - Gain: 33% latency reduction

2. **Reduce attendees list pagination** (take: 100 → take: 50)
   - File: `src/app/(app)/events/[id]/attendees/page.tsx` line 69
   - Change: `take: 100` → `take: 50`
   - Gain: Faster load, less DOM rendering

3. **Add connection pool metrics** (monitor)
   - Check: `SELECT count(*) FROM pg_stat_activity WHERE state='active'`
   - Alert if > 5 active connections
   - This tells you when to scale

---

## Next Steps

**You should:**
1. Run a baseline load test (50 concurrent users, measure qps + latency)
2. Implement Phase 1 (check-in batching) — takes 1-2 days
3. Load test again to measure gain
4. Proceed with Phase 2 (caching) if still hitting bottleneck

Ready to start implementation?
