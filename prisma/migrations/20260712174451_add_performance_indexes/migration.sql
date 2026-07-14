-- Add performance indexes for common query patterns

CREATE INDEX "Event_ministryId_startAt_idx" ON "Event"("ministryId", "startAt");

CREATE INDEX "Event_ministryId_endAt_idx" ON "Event"("ministryId", "endAt");

CREATE INDEX "Event_organizerId_startAt_idx" ON "Event"("organizerId", "startAt");

CREATE INDEX "EventAttendee_userId_status_idx" ON "EventAttendee"("userId", "status");

CREATE INDEX "AuditLog_ministryId_createdAt_idx" ON "AuditLog"("ministryId", "createdAt");
