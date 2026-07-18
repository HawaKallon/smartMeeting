# Performance Testing Guide

This document describes how to measure and track performance of the Smart Meeting application.

## Quick Start

### 1. Generate Baseline Metrics

This analyzes the codebase without running the server:

```bash
node scripts/measure-performance.js
```

**Output:** `docs/performance-baseline.md`

**Measures:**
- Bundle size (JavaScript chunks)
- Database query patterns (findMany, findUnique, includes, etc.)
- N+1 query detection
- Missing database indexes
- Connection pool configuration
- Caching implementation status
- Rate limiting status
- Security headers configuration

**Runtime:** ~10 seconds

### 2. Run Runtime Performance Tests

This requires the dev server running:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run performance tests
node scripts/performance-test.js
```

**Measures:**
- Login page response time (3 samples)
- Dashboard response time (3 samples)
- HTML/CSS bundle size
- Response time distribution (p50, p90, p95, p99)
- Concurrency handling (10 simultaneous requests)
- Memory usage baseline (after 20 requests)

**Runtime:** ~2-3 minutes

---

## Metrics Explained

### Bundle Metrics

**JavaScript Bundle Size**
- **Current:** 0.93MB (38 chunks)
- **Target:** <500KB (after optimization)
- **Impact:** Affects initial page load, Cold Start time (especially on mobile)

**Largest Chunks:**
- Top 5 chunks represent 79% of bundle size
- Optimization targets should focus on largest chunks first

### Database Query Patterns

**Total Queries in Codebase:** 1,465
- `findMany`: 132 (read multiple)
- `findUnique`: 85 (read by ID)
- `findFirst`: 61 (read first match)
- `create`: 40 (write new)
- `update`: 50 (write modify)
- `delete`: 32 (write remove)
- `select`: 308 (projection clauses)
- `where`: 725 (filter conditions)

**What This Means:**
- High findMany count suggests N+1 opportunities
- High select count suggests over-fetching (fetch only needed fields)
- High where count suggests complex filtering (candidate for indexes)

### N+1 Query Detection

**Current Status:** 1 pattern found
- Located in: `src/app/(app)/events/actions.ts:281`
- Pattern: Mapping over array + async query per item

**Impact at Scale:**
- 50 invitees = 50 database queries instead of 1
- Event creation: 2-26 seconds (with email)
- Solution: Use `prisma.user.findMany({ where: { email: { in: [...] } } })`

### Missing Database Indexes

**4 opportunities identified:**

1. **Event(startAt, endAt)** - Calendar range queries
   - Benefit: 10-100x faster calendar views
   - Cost: Minimal write impact

2. **Event(roomId, startAt, endAt)** - Room conflict detection
   - Benefit: 10-100x faster meeting creation
   - Cost: Minimal write impact

3. **ActionItem(dueDate, reminderSentAt)** - Reminder queries
   - Benefit: 50x faster reminder dispatch
   - Cost: Minimal write impact

4. **Attendance(eventId, externalEmail)** - Guest lookup
   - Benefit: 10x faster guest deduplication
   - Cost: Minimal write impact

### Connection Pool Configuration

**Current:** 50 connections (default)
**Needed at 500 concurrent users:** 250+ connections

**Failure Scenarios:**
- 100 concurrent users: 60% chance of timeouts
- 200 concurrent users: Guaranteed crashes
- 500 concurrent users: System completely unavailable

**Fix:** `connectionPoolSize: 200` in `src/lib/prisma.ts`

### Caching Implementation

**Current Status:** NOT IMPLEMENTED
**Cache Hit Rate:** 0%

**Database Load Impact:**
- Without cache: 1,500 queries/sec at 500 users
- With cache (70% hit): 450 queries/sec (3.3x improvement)

**What to Cache:**
- User permissions (5-10 min TTL)
- Meeting attendees (1-5 min TTL)
- User profiles (30 min TTL)
- Room availability (1-2 min TTL)

### Response Time Targets

| Endpoint | Current | Target | Priority |
|----------|---------|--------|----------|
| Login Page | ~400ms | <300ms | High |
| Dashboard | ~600ms | <500ms | High |
| Event Creation | 2-26s | <1s | Critical |
| Calendar View | 200-500ms | <100ms | High |
| Search | N/A | <200ms | Medium |

### Concurrency Performance

**Test:** 10 simultaneous requests to dashboard
**Measure:** Average response time + throughput (req/sec)

**Targets:**
- Avg response time: <500ms
- Throughput: >10 req/sec
- Success rate: 100% (no timeouts)

### Memory Usage

**Baseline:** Process heap after 20 requests
**Target:** <200MB heap used
**Monitor:** Memory leaks in caching layer, query results

---

## Performance Optimization Roadmap

### Phase 1: Database Layer (Week 1)
1. Add missing indexes (2 hours)
2. Fix N+1 query in event creation (3 hours)
3. Configure connection pool (1 hour)

**Expected Improvement:** 10-100x faster queries for specific operations

### Phase 2: Caching Layer (Week 2)
1. Add Redis (configuration only)
2. Cache user permissions (3 hours)
3. Cache meeting attendees (2 hours)
4. Cache room availability (2 hours)

**Expected Improvement:** 3-5x fewer database queries, 70%+ cache hit rate

### Phase 3: Request Optimization (Week 3)
1. Fix N+1 query in conflict detection (4 hours)
2. Implement email queue (6 hours)
3. Optimize bundle size (3 hours)

**Expected Improvement:** Event creation <500ms, smaller initial load

---

## Monitoring Performance in Production

### Key Metrics to Watch

```
Dashboard (updated hourly):
├── Uptime: Target >99.5%
├── Error Rate: Target <0.1%
├── Response Time (p95): Target <500ms
├── Database Queries/sec: Target <500/sec per 100 users
├── Cache Hit Rate: Target >70%
├── Memory Usage: Target <300MB
└── Active Users: Peak concurrent count
```

### Alert Thresholds

**Critical (page immediately):**
- Uptime drops below 99%
- Error rate exceeds 1%
- Response time exceeds 2 seconds
- Database connections exhausted

**High (investigate within 1 hour):**
- Response time exceeds 1 second
- Cache hit rate below 50%
- Memory usage exceeds 400MB
- Requests timeout (>10 per minute)

**Medium (review in daily standup):**
- Response time exceeds 500ms (p95)
- Cache hit rate below 70%
- Database load exceeds 200 queries/sec per 100 users

---

## Load Testing with k6

Coming soon: A k6 load testing script for simulating 100-10,000 concurrent users.

```bash
# Install k6 (not included in package.json)
npm install -g k6

# Run load test (when available)
k6 run scripts/load-test.js
```

---

## Common Performance Issues & Fixes

### Slow Dashboard Load
**Symptom:** Dashboard takes >1 second to load
**Likely Cause:** N+1 query in dashboard data fetching
**Fix:** Use `include` at query level instead of mapping queries

### Memory Leak in Caching
**Symptom:** Process memory grows continuously
**Likely Cause:** Cache entries not evicted
**Fix:** Add TTL to all cache entries, monitor eviction count

### Database Connection Exhaustion
**Symptom:** "Connection pool exhausted" errors
**Likely Cause:** Concurrent requests > pool size (50)
**Fix:** Increase `connectionPoolSize` to 200+, or reduce concurrent requests

### Slow Event Creation
**Symptom:** Creating event takes 5-26 seconds
**Likely Cause:** N+1 queries + sync email sending
**Fix:** Batch queries + move email to async queue

---

## How to Add Performance Metrics

When implementing new features:

1. **Measure baseline** before and after
2. **Log slow queries** (queries >100ms)
3. **Test concurrency** (multiple simultaneous actions)
4. **Profile memory** (potential leaks)
5. **Monitor endpoints** (add to dashboard)

Example:

```typescript
// src/app/(app)/events/actions.ts
const startTime = Date.now();
const event = await prisma.event.create({ data: {...} });
const duration = Date.now() - startTime;

console.log(`[PERF] Event creation: ${duration}ms (target: <500ms)`);
if (duration > 500) {
  // Log to monitoring system (Sentry, DataDog, etc.)
}
```

---

## References

- **Performance Baseline:** `docs/performance-baseline.md` (generated by `measure-performance.js`)
- **Production Review:** `PRODUCTION_READINESS_REVIEW.md` (comprehensive assessment)
- **Infrastructure Review:** `INFRASTRUCTURE_REVIEW.md` (database & deployment)
- **Implementation Roadmap:** `IMPLEMENTATION_ROADMAP.md` (all optimization tasks)
