-- Fix the status column to use PublicEventStatus enum type instead of VARCHAR

-- Drop the default first
ALTER TABLE "Event" ALTER COLUMN "status" DROP DEFAULT;

-- Convert the column type
ALTER TABLE "Event"
  ALTER COLUMN "status" TYPE "PublicEventStatus" USING ("status"::"PublicEventStatus");

-- Set the default back
ALTER TABLE "Event"
  ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
