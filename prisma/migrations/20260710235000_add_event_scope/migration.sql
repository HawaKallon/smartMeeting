-- CreateEnum
CREATE TYPE "EventScope" AS ENUM ('OFFICIAL', 'TEAM');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "scope" "EventScope" NOT NULL DEFAULT 'TEAM';
