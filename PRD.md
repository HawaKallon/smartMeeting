# Smart Meeting & Attendance Logger
## Product Requirements Document (As-Built)

**Document Version:** 1.0 (As-Built from Code)  
**Last Updated:** July 22, 2026  
**Target Audience:** Engineering & Product Teams  
**Classification:** Internal - Product Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Roles & Access Control](#roles--access-control)
3. [Authentication](#authentication)
4. [Core Features](#core-features)
5. [Data Model](#data-model)
6. [Integrations](#integrations)
7. [Known Gaps & Constraints](#known-gaps--constraints)

---

## Overview

**Smart Meeting & Attendance Logger** is a digital platform for managing government ministry meetings, verifying attendance, recording minutes, tracking action items, and managing room bookings. Designed for multi-ministry deployment with strict role-based access control and data isolation.

### Core Value Propositions

- **Verified Attendance:** QR code check-in with mandatory typed name, drawn signature, and optional geofence GPS verification to prevent proxy sign-ins
- **Fast Minutes Distribution:** Manual minutes drafting, published by organizers (no external approval gates), distributed to attendees same-day
- **Action Item Tracking:** Automatic task generation from meeting minutes, Kanban-style progress tracking, deadline reminders (including Monday reminders), and owner-specific notifications
- **Conflict-Free Room Booking:** Self-service room booking with serializable-isolation double-booking prevention, visible ministry-wide availability
- **Dual Calendar System:** Internal ministry meetings and externally-visible public events, independently managed and published
- **Comprehensive Audit Trail:** Append-only audit logging of all administrative actions, signatures, and access for compliance verification

### Architecture

- **Tech Stack:** Next.js 16 (React 19), Prisma 7 + Postgres, Auth.js v5, Tailwind v4, Zod v4
- **Deployment:** Self-hosted on-premise (data residency requirement)
- **Scale Target:** Year 1 = 5,000+ users across 10+ ministries, 100+ meetings/week, 1M+ attendance records
- **Current Capacity:** ~200 concurrent users (query-heavy, pending Redis integration; see *Known Gaps*)

---

## Roles & Access Control

### System Roles (RBAC)

Four hierarchical system roles control feature access:

| Role | Level | Capabilities |
|------|-------|---|
| **SUPER_ADMIN** | 0 (highest) | Platform-wide administration; manages all ministries; bypasses ministry scoping; full audit access |
| **MINISTER** | 1 | Senior ministry official; can organize meetings, publish minutes, approve staff actions, limited to own ministry |
| **MINISTRY_ADMIN** | 2 | Ministry operations admin; manages users, rooms, settings, compliance; limited to own ministry |
| **STAFF** | 3 | Operational civil servants; create/manage events, minutes, attendance, action items; limited to own ministry |

**Note:** `jobTitle` is a separate free-text field (e.g., "Permanent Secretary", "Deputy Minister") recording the person's actual organizational title, distinct from their access level.

### Capability Model

- **`isMinistryAdminLevel(role)`** — true for `MINISTER` or `MINISTRY_ADMIN`. Gates: ministry user/room/setting management, minute approval gates that check "can publish this meeting" vs "can only view".
- **`canManageEvents(role)`** — true for `STAFF` and above. Gates: event creation/editing access at the list-page level.
- **`canManageEvent(actor, event)`** — per-event permission. True if: actor is `SUPER_ADMIN` OR (actor's ministry matches event's ministry AND (actor is organizer OR any co-organizer OR `isMinistryAdminLevel`)). For public events (`organizerId === null`), only ministry-admin-level can manage.
- **`canReassignEvent(actor, event)`** — stricter than `canManageEvent`. True if: actor is `SUPER_ADMIN` OR (actor is the event's original organizer OR `isMinistryAdminLevel`). Co-organizers cannot reassign.

### Multi-Tenancy

Every data-scoped query calls `ministryScope(user)` (returns `{ ministryId: user.ministryId }` for ministry users, `{}` for super-admins) or `assertSameMinistry(user, entityMinistryId)` to prevent cross-ministry data leakage. Ministry admins only see their own ministry; super-admins see all.

---

## Authentication

**Provider:** Auth.js v5 with local Credentials strategy (email + password).

**Flow:**
1. Normalize email (lowercase/trim)
2. **Government-only gate:** Reject if email domain is not `.gov.sl` or a subdomain thereof (e.g., `*.gov.sl`). Hard block; no fallback auth method.
3. Look up `User` by email; reject if no `passwordHash` or user is marked `active = false`
4. Verify password with bcrypt
5. **Ministry auto-resolution:** For non-super-admin users, resolve ministry from email domain via `Ministry.emailDomain` lookup; reject if no match or ministry is inactive. SUPER_ADMIN users have `ministryId = null`
6. Record login in audit log
7. Generate JWT session with `id`, `email`, `name`, `systemRole`, `jobTitle`, `ministryId`

**Session:**
- **Timeout:** 30 minutes of inactivity (user-configurable per `/settings`)
- **Strategy:** JWT (Edge-compatible via `src/auth.config.ts`; node-side extensions in `src/auth.ts`)

**Middleware (`src/proxy.ts`):**
- Public prefixes (no auth): `/checkin`, `/rsvp`, `/api/auth`, `/api/cron`, `/public-calendar`, `/login`
- All `/administrative/*` routes require auth; unauthenticated requests redirect to `/administrative/login` with `callbackUrl`
- Legacy unprefixed routes (`/events`, `/admin`, etc.) 301-redirect to `/administrative/...` equivalents
- URL rewriting: `/administrative/*` is internally rewritten to `/(app)/...` so the app shell continues to resolve

---

## Core Features

### 1. Events & Calendar

**Dual activity system:**

#### Internal Meetings (`isPublic = false`)
- **Event Types:** MEETING, CONFERENCE, APPOINTMENT
- **Scopes:** OFFICIAL (organizer approval workflow) or TEAM (no approval required)
- **Classification:** PUBLIC or RESTRICTED (controls minutes/attendance visibility)
- **Color Priority:** RED (urgent/cabinet), AMBER (internal), GREEN (routine) — purely informational, no access gate
- **Organizer:** Single creator; **co-organizers are mandatory** (at least one; list of ministry users)
- **Room Binding:** Optional; if set, conflicts checked against existing events and room bookings
- **Venue Geofence:** Optional GPS lat/lng + radius (meters). If set at QR-code-generation time, geofence verification becomes mandatory for all attendees at check-in
- **Recurring:** Via `EventSeries` model; materialized as individual `Event` rows (up to 200 occurrences). Edit scopes: THIS (single), FUTURE (this + later), ALL (entire series). Pattern changes regenerate the series with existing attendee list preserved

#### Public Activities (`isPublic = true`)
- **Categories:** CONFERENCE, WORKSHOP, TRAINING, MEETING, LAUNCH, OTHER
- **Status:** DRAFT or PUBLISHED
- **Organizer:** Null; owned by ministry-level. Only ministry-admin-level can manage
- **Venue:** Free-text name (no room binding); external URL optional
- **Banner Image:** Optional (uploaded to Cloudinary)
- **Invited Ministries:** Multi-select; invites sent to those ministries' admin accounts
- **No minutes/attendance tracking** on public events

**Create/Edit Workflow:**
- Create-event form is a single surface that toggles between "Internal Activity" and "Public Activity" tabs
- Room conflict detection runs in `$transaction` to avoid race conditions (though not serializable isolation)
- Recurring events use batch-optimized query (`materializeOccurrencesBatch`) — ~4 queries for a 52-week series instead of 156
- Raw SQL update for reschedules (`UPDATE ... CASE WHEN ...`) to avoid N separate updates

**Role Gates:**
- Create: `requireStaffRole()` (STAFF and above)
- Manage (edit/delete/add-remove-attendees): `canManageEvent()` per event
- Reassign co-organizers: `canReassignEvent()` per event (stricter; only original organizer or ministry-admin-level)
- Publish (public events only): `canManageEvent()`

---

### 2. Check-In & Attendance

**QR-Based Attendance Verification:**

#### QR Token & Display (`getActiveToken`, `generateCheckInQr`)
- Rotating 5-minute TTL tokens (base64url, 24 random bytes)
- `getActiveToken()` returns an existing token with >30 seconds TTL left, or mints a fresh one
- Organizer's QR display page (`checkin-code/page.tsx`) polls via `RefreshOnExpiry.tsx` client component, showing a **live MM:SS countdown** that triggers `router.refresh()` when it hits zero
- Screenshot of old QR code (>5 min old) is expired and non-functional (intentional anti-proxy design)
- QR code open URL: `/checkin/{token}`

#### Check-In Form (`/checkin/[token]`, public page)
1. **Preconditions:**
   - User must be logged in (redirect to login if not)
   - User must be on the event's invite list (`EventAttendee` row must exist)
   - Meeting must not have ended (`now <= event.endAt`)

2. **Geofence Check (if event has `venueLat`/`venueLng`):**
   - **Mandatory** if venue coords are set (not optional)
   - Browser requests `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`
   - Server rejects if:
     - Lat/lng missing (never trusts client to omit)
     - Client reports `accuracy === 0` or explicit mock-location flag
     - Reported accuracy exceeds `ministry.compoundMaxGpsAccuracy` (default 75m)
     - Haversine distance from venue > `event.geofenceRadius` (default 100m)
   - Records: `lat`, `lng`, `gpsAccuracy` (raw meter value), `withinGeofence` (boolean), `mockLocationFlag`

3. **Signature & Name Capture (mandatory):**
   - **Typed Name:** Min 2 characters; user types as they want it to appear in records
   - **Drawn Signature:** Canvas-based (`SignaturePad.tsx`), works on touchscreen or mouse, exported as data URL
   - Form submit disabled client-side until both fields are populated

4. **Check-In Record:**
   - Idempotent by `(eventId, userId)` — pre-check by unique constraint; duplicate attempts caught and treated as "already checked in" (caught `P2002`)
   - Records: `eventId`, `userId`, `signedName`, `signature` (base64 data URL), `checkInAt` (auto `now()`), `method` (QR/MANUAL/GEO), `lat`, `lng`, `gpsAccuracy`, `withinGeofence`, `mockLocationFlag`, `ipAddress` (from `x-forwarded-for`)
   - Audited: `audit({ action: "CHECK_IN", entityType: "Attendance", ... })`

#### Manual Check-In (Staff Fallback)
- **Dashboard:** Organizer/staff see attendee list with inline "Check In" button or a walk-in form
- **Attendees without smartphones** or external guests can be manually checked in by staff
- **Deduplication:** Registered users matched by ID; external guests by name/email (case-insensitive OR match)
- **Records:** Method = "MANUAL", `checkedInBy` field populated

#### RSVP & Invitations
- On event creation, each `EventAttendee` row gets a rotating `rsvpTokenHash` (SHA-256, never the raw token)
- **Self-RSVP:** Attendees can accept/decline via token link (`/rsvp/[token]`); response propagates across all future occurrences in a recurring series in one batch update
- **Staff override:** `updateAttendeeStatus` allows staff to change RSVP status (INVITED/CONFIRMED/DECLINED)
- **Invite/Remove:** `inviteUser` (internal, same-ministry gate), `inviteExternal` (guest by name/email) — both propagate to ALL future occurrences of a recurring series in one `createMany`

**Role Gates:**
- Check-in via QR: `canCheckIn()` (all authenticated users)
- Generate/manage QR code: `canManageEvent()`
- Manual check-in/RSVP override: `canManageEvent()`

---

### 3. Meeting Minutes

**Manual-Only Minutes:**

#### Lifecycle
- **DRAFT** — Secretary types minutes in a text editor; editable indefinitely within the edit window
- **PUBLISHED** — Organizer or co-organizer publishes; locked for editing (except by ministry-admin-level if edit window hasn't expired)

#### Edit Window & Archival (`src/lib/minutesPolicy.ts`)
- **Edit window:** 2 days after meeting end. After this, edits are blocked for regular staff (checked by `isMinutesEditWindowClosed`)
- **Ministry-admin override:** `isMinistryAdminLevel` users can edit outside the window
- **Archival:** Minutes marked as archived 6 months after the meeting (informational flag; doesn't lock access)

#### Publication & Distribution
- **Permissions:**
  - Organizer can publish
  - Co-organizers can publish
  - **Not ministry-admin alone** (role is insufficent; must be organizer/co-org)
  - SUPER_ADMIN can publish any meeting
- **Validation:** Title, body, attendee list non-empty
- **Fan-out:**
  - Email to all INVITED/CONFIRMED attendees (respects `minutesNotifications` preference)
  - In-app notification to all attendees
  - External attendees (non-registered) get email + guest-portal link (see *Guest Portal* below)

#### Guest Portal
- **URL:** `/guest/[rsvpTokenHash]/minutes`
- **Access:** External (non-registered) attendees via RSVP token
- **Content:** Published minutes + their assigned action items only
- **No auth required** — token-gated access

**Role Gates:**
- Draft minutes: organizer/co-organizer or ministry-admin-level (same ministry)
- Publish minutes: organizer/co-organizer only (not ministry-admin alone)

---

### 4. Action Items

**Manual Entry Tied to Minutes:**

#### Creation & Assignment
- **Location:** Minutes drafting form (`ActionItemsPanel.tsx`); items exist only as part of minutes until published
- **Fields:** `title`, `ownerName` (free-text name — resolved server-side), `dueDate` + client's `timezoneOffset`, `point` (ACTION_POINT or AGREED), `status` (TODO/IN_PROGRESS/DONE)
- **Owner Resolution (`resolveActionItemAssignee`):**
  1. Try exact-insensitive name match against internal `User` (same ministry, excluding super-admins)
  2. If no match, try exact email match against `User`
  3. If no match, try external `EventAttendee` by email
  4. If still no match, try external `EventAttendee` by name (only if unambiguous — exactly one match)
- **Due Date Validation:** Rejects due dates in the past (`parseFutureTimeline`)
- **Notifications:**
  - Internal owners: in-app `notify()` + queued email
  - External owners: queued email only
  - All meeting invitees (minus the assignee) get lighter notification ("new action item created")

#### Kanban Board (`/action-items`)
- **Cross-event task board** with drag-and-drop (`@dnd-kit/core`)
- **Columns:** To Do | In Progress | Done
- **Cards:** Task title, point-type badge, source event title, due date, overdue flag (computed client-side)
- **Drag permissions:**
  - `canManageEvents()` users can drag any card (team-lead visibility)
  - Assignee can always drag their own card
  - **Note:** Kanban drag does NOT check `minutes.status` — items can be moved even after minutes published (unlike the per-event minutes page, which locks items once published)
- **Filters:** By owner, by status, by priority
- **Views:** Kanban (default) or table (`ActionItemsTable.tsx`)

#### Status Tracking
- **Workflow:** TODO → IN_PROGRESS → DONE
- **Status changes trigger:**
  - Update `reminderSentAt` to null (so reminder cron re-fires)
  - Notification to all meeting invitees: "status changed to X"

#### Reminders
- **Cron:** `/api/cron/reminders` (registered in `vercel.json`; runs daily at 08:00 UTC)
- **Eligibility:** TODO/IN_PROGRESS items with `dueDate` within next 24h and `reminderSentAt = null`
- **Channels:**
  - **Internal owners:** respect `emailNotifications` + `actionItemNotifications` preferences; send in-app + email
  - **External owners:** email always
- **Idempotency:** `reminderSentAt` stamping prevents re-sending

#### Edit & Delete
- **Locked after minutes published** — action items become read-only from the event-detail minutes page
- **Kanban drag still works** — status can be changed via board, but not from the event-detail surface

**Role Gates:**
- Add/edit/delete items on the event's minutes page: `canManageEvent()`
- Kanban drag: `canManageEvents()` for any card, or assignee for own card

---

### 5. Room Booking

**Self-Service Booking with Conflict Prevention:**

#### Self-Service Booking (`/rooms/book`, `bookRoom` action)
- **Fields:** `roomId` (scoped to actor's ministry), `date`, `startTime`, `endTime`, `purpose` (enum: MEETING/TRAINING/CONFERENCE/WORKSHOP/INTERVIEW/OTHER), `attendeeCount` (validated against `room.capacity`), optional `notes`
- **Conflict Detection:**
  - Checks against existing `Event` rows (room binding)
  - Checks against existing `RoomBooking` rows
  - Runs inside a `$transaction` with **Postgres `Serializable` isolation level** — genuine concurrency safety
  - If two bookings race for the same slot, one fails with `P2034` (serialization failure) caught and reported as "That time was just booked"
- **Cancel:** `cancelBooking` — only the booking's creator can cancel (soft-delete via `status = "CANCELLED"`)

#### Room Management (`/admin/rooms`, Super-admin/Ministry-admin only)
- **CRUD:** `createRoom`, `updateRoom`, `deleteRoom`
- **Fields:** `name` (unique per ministry), `location` (free-text), `capacity` (Int), `amenities` (String[]), optional `latitude`/`longitude` (for compound-level geofencing separate from per-event geofence)
- **Inline Creation:** Event-creation form has "+ Create Room" affordance so organizers aren't blocked on admin availability

#### Browsing & Availability
- **`/rooms/availability`:** `AvailabilityDatePicker` + `RoomSelect` UI for browsing rooms and checking free slots
- **`/rooms/[id]`:** Room detail page

**Role Gates:**
- Book a room: `requireStaffRole()` (any authenticated staff), scoped to own ministry's rooms
- Manage room records: `assertAdminRole()` (ministry-admin-level or super-admin)

---

### 6. Reporting & Audit

#### Analytics Dashboard (`/reports`)
- **Gated to:** `canManageEvents()` or `SUPER_ADMIN`
- **Content:**
  - User counts by role
  - Ministry list (super-admin only)
  - Room inventory
  - Event counts (total, upcoming, past, by type, monthly trend)
  - Attendance stats: total check-ins, attendance rate (checked-in / invited %), check-in method breakdown (QR/MANUAL/GEO), geofence in/out distribution, mock-location flag count (anti-spoofing metric)
- **Exports:** CSV and PDF via `/api/reports/export` and `/api/reports/pdf`
- **Tenancy:** Scoped by `ministryScope(user)`

#### Attendance Summary (`/attendance`)
- **Gated to:** `requireStaffRole()` (any staff)
- **Content:** Attendance rate table for last 50 events per ministry, with color-coded badges (≥80% green, ≥50% amber, else red)

#### Audit Log Viewer (`/admin/activity`)
- **Gated to:** `requireAdminRole()`
- **Content:** Paginated (50/page), filterable audit log table; shows actor, action, entity type/id, raw JSON metadata, timestamp
- **Scoped:** By ministry (ministry admins see own only; super-admin sees all)
- **Metrics:** Summary tiles (Total Actions, Today, Users Active)

#### Audit Logging (`src/lib/audit.ts`)
- **Model:** `AuditLog` — append-only (never updated or deleted)
- **Fields:** `id`, `ministryId`, `actorId`, `action` (string, e.g., "CHECK_IN", "PUBLISH_MINUTES", "CREATE_EVENT"), `entityType` (string), `entityId`, `metadata` (Json), `createdAt`
- **Pattern:** Every state-changing action calls `audit({...})` — does not throw if audit fails; logged and swallowed so audit can never break primary action
- **Coverage:** Triggered on check-in, event create/edit/delete, minutes publish, action-item status change, user create/role-change, etc.

**Role Gates:**
- View reports: `canManageEvents()` or `SUPER_ADMIN`
- View audit log: `requireAdminRole()`

---

### 7. Notifications

#### Channels
- **Email:** Via Resend (if `RESEND_API_KEY` set); queued through Inngest for automatic retries (3x)
- **In-App:** `Notification` model entries; appear on dashboard + notification bell icon
- **No SMS** — Twilio integration is fully stubbed and not in use

#### Triggers & Types
- Meeting invitations (email + in-app)
- Meeting reminders (1h before)
- Check-in reminder (as meeting time approaches)
- Minutes published (email + in-app)
- Action item assigned (email + in-app)
- Action item due-soon (email reminder cron daily at 08:00)
- Action item status changed (email + in-app to all invitees)
- System alerts (errors, maintenance)

#### User Preferences
- `emailNotifications` (default true) — gates ALL email sends
- `minutesNotifications` (default true) — gates minutes-published emails specifically
- `meetingReminders` (default true) — gates meeting-reminder emails
- `actionItemNotifications` (default true) — gates action-item emails
- `theme`, `compactMode`, `sessionTimeout`, `autoDeleteRecordings` (other preferences)

#### Email Queue (`src/lib/email-queue.ts` + Inngest)
- Server action → `queue*Email()` → Inngest event → handler in `src/inngest/functions.ts` → actual `send*Email()` call
- Inngest provides: automatic retries (up to 3x), delivery guarantees, dead-letter queue for failed sends
- Config: `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`

---

### 8. Ministry & User Administration

#### Ministry Management (`/admin/ministries`, super-admin only)
- **Fields:** `name` (unique), `code` (unique, uppercase), `emailDomain` (must match `.gov.sl` or subdomain pattern via `isGovDomain` check), `compoundMaxGpsAccuracy` (meters, default 75 — the GPS tolerance for all geofence checks in this ministry), `active` (Boolean; deactivated ministries' users cannot log in)
- **One MINISTER per ministry:** Unique constraint enforced; attempting to create two raises `P2002`
- **First-user provisioning:** `provisionUser` auto-generates a temp password + welcome email on ministry creation

#### User Management (`/admin/users`, ministry-admin-level or super-admin)
- **Create:** Email must match `.gov.sl` domain; must match the target ministry's `emailDomain`; auto-generates temp password + welcome email
- **Roles:** `systemRole` assignment (MINISTER only by super-admin; others by ministry-admin-level)
- **Activate/Deactivate:** Toggle `active` Boolean; deactivated users cannot log in
- **Delete:** Hard-delete for super-admin; soft-delete (set `deletedAt`) for ministry-admin. Blocked if user organizes any events (must reassign first)
- **Reset Password:** Reissue temp password + invite email (via `sendWelcomeEmail`)

---

## Data Model

Core entities (non-exhaustive; see `prisma/schema.prisma` for full details):

| Entity | Key Fields | Relations | Notes |
|--------|-----------|-----------|-------|
| **Ministry** | `id, name, code, emailDomain, compoundMaxGpsAccuracy, active` | Users, Events, Rooms, RoomBookings, AuditLogs, Notifications | One MINISTER per ministry (unique constraint) |
| **User** | `id, email, name, systemRole, jobTitle, ministryId, active, passwordHash` | Preferences (emailNotifications, minutesNotifications, etc.), organized/co-organized events, attendances, action items | Free-text jobTitle separate from systemRole |
| **Event** | `id, title, isPublic, type (MEETING/CONFERENCE/APPOINTMENT), scope (OFFICIAL/TEAM), classification, colorCategory, startAt, endAt, venueName, venueLat, venueLng, geofenceRadius, ministryId, roomId, seriesId` | Attendees, Attendances, Minutes, ActionItems, Recordings, QRTokens, co-organizers | `isPublic=true` → public activity; `organizerId=null` for ministry-owned; recurence via seriesId |
| **EventSeries** | `id, frequency (DAILY/WEEKLY/WEEKDAYS/MONTHLY), interval, endType (COUNT/UNTIL), count, until` | Events (occurrences) | Materialized as individual Event rows |
| **EventAttendee** | `eventId, userId, externalName, externalEmail, status (INVITED/CONFIRMED/DECLINED), rsvpTokenHash, respondedAt` | Unique([eventId, userId]) | External guests have null userId; deduping by app-level logic |
| **Attendance** | `id, eventId, userId, signedName, signature, checkInAt, method (QR/MANUAL/GEO), lat, lng, gpsAccuracy, withinGeofence, mockLocationFlag, ipAddress` | Unique([eventId, userId]) | Raw audit fields for anti-spoofing |
| **Minutes** | `id, eventId (1:1), body, summary, status (DRAFT/PUBLISHED), draftedById, draftedAt, publishedById, publishedAt` | ActionItems | Summary field for optional note/summary text |
| **ActionItem** | `id, minutesId, title, ownerId, ownerName, assignedById, dueDate, reminderSentAt, point (ACTION_POINT/AGREED), status (TODO/IN_PROGRESS/DONE)` | Owner (User, nullable), assignedBy (User, nullable) | Assignee is nullable; external guests use ownerName string |
| **Room** | `id, ministryId, name, location, capacity, amenities (String[]), latitude, longitude` | Bookings, Events | Unique([ministryId, name]) |
| **RoomBooking** | `id, ministryId, roomId, userId, startTime, endTime, purpose, attendeeCount, status (CONFIRMED/CANCELLED)` | Unique([roomId, startTime, endTime]) | Serializable isolation for conflict prevention |
| **QRToken** | `id, eventId, token (unique), expiresAt` | None | 5-minute TTL; rotates to prevent screenshot reuse |
| **AuditLog** | `id, ministryId, actorId, action, entityType, entityId, metadata (Json)` | None | Append-only; never updated/deleted |
| **Notification** | `id, userId, ministryId, type (string), title, body, link, read` | Indexed by userId, read status, creation time | In-app notification record |

---

## Integrations

### Email (Resend + Inngest)
| Integration | Config | Behavior | Status |
|---|---|---|---|
| **Resend (email service)** | `RESEND_API_KEY`, `EMAIL_FROM` | Queued via Inngest; 3x retries; official government HTML templates | Graceful degradation: skips sends with warn log if unconfigured |
| **Inngest (job queue)** | `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` | Durable email delivery, dead-letter queue | Required for email reliability (all sends queued, not synchronous) |

**Triggers:** Invitations, minutes published, action items assigned/due, system alerts

---

### Images
| Integration | Config | Path | Behavior | Status |
|---|---|---|---|---|
| **Cloudinary (primary)** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Event banners, public-calendar banners, user avatars | Throws config error if unconfigured; no graceful stub | **Note:** Two parallel implementations exist; consolidation recommended (see *Known Gaps*) |
| **Local uploads (legacy)** | None | `public-uploads/` directory on filesystem | Event/avatar images; publicly served at `/public-uploads/[name]` (no auth check) | |

---

### Cron & Scheduled Tasks
| Endpoint | Schedule | Purpose | Config | Status |
|---|---|---|---|---|
| `/api/cron/reminders` | Daily 08:00 UTC (registered in `vercel.json`) | Action item due-soon reminders (24h lookahead) | `CRON_SECRET` (optional auth) | **Active** |
| `/api/cron/meeting-reminders` | Should run every 10-15 min (per code comment) | Meeting starting-soon reminders (1h lookahead) | `CRON_SECRET` (optional auth) | **Gap:** Not registered in `vercel.json`; no automatic schedule; requires external trigger |

---

### Redis (Caching Infrastructure)
| Feature | Config | Status | Notes |
|---|---|---|---|
| **Cache layer** | `REDIS_URL` | **Built but not integrated** | Full hybrid TTL + event-invalidation infrastructure exists in `src/lib/cache*.ts`, `cacheHelpers.ts` with 15-minute role, 30-minute ministry, 10-minute event, 5-minute dashboard TTLs, but zero call sites use it. Every request still hits Postgres directly. See *Known Gaps*. |

---

## Known Gaps & Constraints

### Performance
- **Current capacity:** ~200 concurrent users (query-heavy, per `QUERY_AUDIT.md`)
- **Bottlenecks:** Check-in flow (4–5 queries), event list (3 parallel queries), attendees page (2 queries)
- **Roadmap:** Redis integration (Phase 2, 2–3 weeks estimated) + optional schema denormalization (Phase 3, 4–6 weeks)

### Cron Scheduling
- **Gap:** `/api/cron/meeting-reminders` endpoint is implemented but **NOT registered** in `vercel.json`. Daily reminders fire (`reminders` at 08:00), but hourly meeting-start reminders have no automatic trigger.
- **Workaround:** Requires external cron service (e.g., cron-job.org, AWS EventBridge) to POST to `/api/cron/meeting-reminders` every 10–15 minutes

### Image Uploads
- **Duplication:** Two parallel implementations exist:
  - `src/lib/cloudinary.ts` (Resend API integration) — used for event/public-calendar banners and user avatars
  - `src/lib/publicUploads.ts` (local filesystem) — legacy/unused for the same purpose
- **Recommendation:** Consolidate to single implementation (likely Cloudinary, deprecate local)

### Schema Artifacts
- **Stale comment:** `schema.prisma` line 528 ends with orphaned doc-comment referencing a never-built `PublicEvent` model: `/// Public calendar events — visible to all without login...`
- **Status:** Public events merged into `Event` model via `isPublic`, `status`, `publishedAt` fields; no separate table exists
- **Action:** Clean up stale comment


---

## Document Notes

**This document describes the product as implemented in the codebase as of 2026-07-22.** It is derived from code exploration and reflects actual deployed features, role models, and workflows. See `CLAUDE.md` and `AGENTS.md` for developer guidelines.

For historical context and roadmap planning, see the parent-folder PRD docs (`/Smart meeting.md`, `COMPLETE_PRD_UPDATED.md`), which capture the vision and earlier design phases.

---

**End of PRD**
