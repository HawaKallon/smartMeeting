-- P1 data-integrity migration.
-- D2: enforce one Attendance per (event, logged-in user); D8: index Event.roomId.

-- D2 dedupe: before adding the unique index, remove any pre-existing duplicate
-- attendances for the same event+user, keeping the earliest row per pair. External
-- guests (userId IS NULL) are excluded — NULLs are distinct in a Postgres unique index.
DELETE FROM "Attendance" a
USING "Attendance" b
WHERE a."userId" IS NOT NULL
  AND a."eventId" = b."eventId"
  AND a."userId" = b."userId"
  AND (a."createdAt" > b."createdAt"
       OR (a."createdAt" = b."createdAt" AND a."id" > b."id"));

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_eventId_userId_key" ON "Attendance"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Event_roomId_idx" ON "Event"("roomId");
