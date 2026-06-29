-- CreateEnum
CREATE TYPE "PublicEventStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "PublicEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "venueName" TEXT,
    "bannerImage" TEXT,
    "externalUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" "PublicEventStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "ministryId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicEvent_status_startAt_idx" ON "PublicEvent"("status", "startAt");

-- CreateIndex
CREATE INDEX "PublicEvent_ministryId_idx" ON "PublicEvent"("ministryId");

-- AddForeignKey
ALTER TABLE "PublicEvent" ADD CONSTRAINT "PublicEvent_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicEvent" ADD CONSTRAINT "PublicEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
