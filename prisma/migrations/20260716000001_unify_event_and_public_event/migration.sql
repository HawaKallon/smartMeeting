-- Unify internal Event and public PublicEvent into a single Event model
-- Adds public-activity fields to Event, makes organizerId nullable, removes PublicEvent and Letter models

-- Add isPublic flag and public event fields to Event
ALTER TABLE "Event" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "category" VARCHAR(255); -- PublicEventCategory enum
ALTER TABLE "Event" ADD COLUMN "bannerImage" TEXT;
ALTER TABLE "Event" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "status" VARCHAR(255) NOT NULL DEFAULT 'PUBLISHED'; -- PublicEventStatus enum
ALTER TABLE "Event" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Event" ADD COLUMN "contactPhone" TEXT;

-- Add contact details columns (both internal and public activities)
-- (already added above)

-- Make organizerId nullable (public activities don't have an organizer)
ALTER TABLE "Event" DROP CONSTRAINT "Event_organizerId_fkey";
ALTER TABLE "Event" ALTER COLUMN "organizerId" DROP NOT NULL;
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey"
  FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename the PublicEvent join table to EventPublicInvites if it exists
-- (it only exists if PublicEvent was created, which won't happen in a fresh migration)
-- Drop and recreate the join table with correct FK references
DROP TABLE IF EXISTS "_PublicEventInvites" CASCADE;

CREATE TABLE "_EventPublicInvites" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_EventPublicInvites_AB_unique" UNIQUE("A", "B"),
  CONSTRAINT "_EventPublicInvites_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_EventPublicInvites_B_fkey" FOREIGN KEY ("B") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "_EventPublicInvites_B_index" on "_EventPublicInvites"("B");

-- Add index for isPublic/status queries
CREATE INDEX "Event_isPublic_status_startAt_idx" on "Event"("isPublic", "status", "startAt");

-- Drop Letter and PublicEvent tables (they'll be empty in this fresh migration)
DROP TABLE IF EXISTS "Letter" CASCADE;
DROP TABLE IF EXISTS "PublicEvent" CASCADE;
