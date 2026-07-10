/*
  Warnings:

  - The `category` column on the `PublicEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PublicEventCategory" AS ENUM ('CONFERENCE', 'WORKSHOP', 'TRAINING', 'MEETING', 'ANNOUNCEMENT', 'PUBLIC_NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ActionItemPoint" AS ENUM ('ACTION_POINT', 'AGREED');

-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "point" "ActionItemPoint" NOT NULL DEFAULT 'ACTION_POINT';

-- AlterTable
ALTER TABLE "PublicEvent" DROP COLUMN "category",
ADD COLUMN     "category" "PublicEventCategory";
