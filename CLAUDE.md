# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Next.js version warning (from AGENTS.md):** This is Next.js 16 with breaking changes from older versions. The docs that ship with the installed version live in `node_modules/next/dist/docs/`. Read the relevant guide there before writing framework code — do not rely on training-data conventions. Notably, **middleware is `src/proxy.ts`, not `middleware.ts`**.

## Project

Smart Meeting & Attendance Logger — an internal ministry/government app for meetings, attendance check-in (QR + geofence), letters/invitations, meeting minutes with AI summaries, action-item tracking, and room booking. Built to a PRD ("Smart meeting.md", referenced throughout the code as "PRD §x"); the schema and libs are heavily annotated with the PRD section each piece implements.

## Commands

```bash
npm run dev          # next dev (Turbopack)
npm run build        # next build
npm run start        # next start (production server)
npm run lint         # eslint

npm run db:migrate   # prisma migrate dev  (create/apply dev migration)
npm run db:seed      # tsx prisma/seed.ts  (seed ministry users, pw: password123)
npx prisma generate  # regenerate the client into src/generated/prisma after schema changes
```

There is **no test runner configured** — no Jest/Vitest/Playwright. Don't assume a `test` script exists.

`.env` is required (gitignored). Key vars: `DATABASE_URL` (Postgres), `AUTH_SECRET`/`AUTH_URL` (Auth.js), and optional integrations: `OPENAI_API_KEY` or `OLLAMA_API_URL`/`OLLAMA_MODEL` (LLM), `RESEND_API_KEY` (email), `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM` (SMS), `CRON_SECRET` (reminder endpoint auth).

## Architecture

**Stack:** Next.js 16 App Router (React 19, all pages async Server Components by default), Prisma 7 + Postgres (via `@prisma/adapter-pg`), Auth.js v5 (next-auth beta), Tailwind v4, Zod v4. TypeScript path alias `@/*` → `src/*`.

**Prisma client is generated to `src/generated/prisma`** (not `@prisma/client`). Import from `@/generated/prisma/client` (PrismaClient, Prisma namespace) and `@/generated/prisma/enums` (the enum types). This dir is gitignored — run `npx prisma generate` after pulling or changing the schema. Always import the shared singleton from `@/lib/prisma`, never construct a `PrismaClient`.

**Auth is split in two for Edge compatibility:**
- `src/auth.config.ts` — Edge-safe config (JWT session strategy, callbacks that put `id` + `role` on the token/session). No Prisma/bcrypt imports.
- `src/auth.ts` — full Node instance adding the Credentials provider (Prisma lookup + bcrypt). Exports `auth`, `signIn`, `signOut`, `handlers`.
- `src/proxy.ts` — the middleware (Next 16 renamed `middleware`→`proxy`). Uses a Prisma-free NextAuth instance to gate all routes behind login; public prefixes are `/login`, `/checkin`, `/api/auth`. **Fine-grained role checks do NOT happen here** — only authentication.

**Authorization** lives in `src/lib/guard.ts` and `src/lib/roles.ts`:
- Pages call `requireUser()` / `requireRole(...)` / `requireStaffRole()` — these `redirect()` to `/login` or `/forbidden`.
- Server actions and route handlers call the throwing variants `assertRole(...)` / `assertStaffRole()`.
- `roles.ts` holds the `MinistryRole` hierarchy and capability helpers (`canManageEvents`, `canApproveMinutes`, etc.). Use these helpers rather than hardcoding role comparisons.

**Mutations are React Server Actions, not API routes.** Each feature folder under `src/app/(app)/.../` has an `actions.ts` (`"use server"`). The established pattern (see `src/app/(app)/events/actions.ts`):
1. `assertStaffRole()` / `assertRole()` first.
2. Validate `FormData` with a Zod schema (`safeParse`, return `{ error }` on failure — actions return `ActionState`).
3. Mutate via `prisma`.
4. `audit({...})` the action (see below).
5. `revalidatePath(...)` affected routes, then `redirect(...)`.

Forms wire to actions via `useActionState` in client components (the `*Form.tsx` / `*Panel.tsx` files).

**Audit logging:** every state-changing action calls `audit(...)` from `@/lib/audit` (append-only `AuditLog` table). It swallows its own errors so logging can never break the primary action. Keep this pattern when adding mutations.

**API routes** (`src/app/api/...` and a few `route.ts`) are reserved for things actions can't do:
- `api/auth/[...nextauth]` — Auth.js handlers.
- `api/cron/reminders` — POST, authed by `Authorization: Bearer $CRON_SECRET`; call from an external cron service.
- `api/letters/[letterId]/pdf` — PDF generation (`@react-pdf/renderer`, `src/lib/generateLetterPdf.tsx`).
- `uploads/[name]` — serves uploaded audio to authenticated users only. **Uploads are stored on the local filesystem in `./uploads/` (outside `/public`), gitignored**, and streamed through this auth-gated route — they are never publicly served.

**Route groups:** `(app)` is the authenticated shell (`(app)/layout.tsx` renders Sidebar + Topbar after `requireUser()`). `/login`, `/checkin/[token]` (public QR check-in), and `/forbidden` live outside it.

**External integrations are all stub-tolerant** — they degrade gracefully when keys are absent, so the full flow is exercisable in dev:
- `src/lib/llm.ts` — `generateText`/`summarizeMeeting`/`extractActionItems`. Uses OpenAI when `OPENAI_API_KEY` is set, otherwise falls back to local Ollama.
- `src/lib/transcription.ts` — OpenAI Whisper; returns a labelled stub segment when no key.
- `src/lib/email.ts` (Resend), `src/lib/sms.ts` (Twilio) — no-op/log when unconfigured.

**Check-in flow:** `src/lib/checkin.ts` mints rotating, time-boxed (`QRToken`, 5-min TTL) signed tokens so screenshotted QR codes expire (anti-proxy). `src/lib/geo.ts` handles geofence distance + mock-location flags; `Attendance` records method (QR/MANUAL/GEO), GPS accuracy, and `withinGeofence`.

## Conventions

- Server Components and Server Actions are the default; reach for `"use client"` only for interactivity (forms, dnd-kit kanban, polling).
- Validate all external input with Zod at the action boundary.
- Reference PRD sections in comments where you implement a spec'd behavior, matching the existing `// PRD §x` style.
- `tsconfig` runs with `strict: false` — but match the typed style of surrounding code rather than leaning on that.
