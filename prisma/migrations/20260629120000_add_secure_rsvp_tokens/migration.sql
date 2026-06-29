-- Secure bearer links for email RSVP. Existing invitations remain tokenless.
ALTER TABLE "EventAttendee"
ADD COLUMN "rsvpTokenHash" TEXT,
ADD COLUMN "respondedAt" TIMESTAMP(3);

CREATE INDEX "EventAttendee_rsvpTokenHash_idx" ON "EventAttendee"("rsvpTokenHash");
