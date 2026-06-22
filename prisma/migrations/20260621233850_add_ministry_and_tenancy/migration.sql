-- CreateEnum for SUPER_ADMIN role
ALTER TYPE "MinistryRole" ADD VALUE 'SUPER_ADMIN';

-- CreateTable Ministry
CREATE TABLE "Ministry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);

-- AddColumn ministryId to User (nullable for SUPER_ADMIN)
ALTER TABLE "User" ADD COLUMN "ministryId" TEXT;

-- AddColumn ministryId to Event (required)
ALTER TABLE "Event" ADD COLUMN "ministryId" TEXT NOT NULL DEFAULT '';

-- AddColumn ministryId to EventSeries (required)
ALTER TABLE "EventSeries" ADD COLUMN "ministryId" TEXT NOT NULL DEFAULT '';

-- AddColumn ministryId to Room (required)
ALTER TABLE "Room" ADD COLUMN "ministryId" TEXT NOT NULL DEFAULT '';

-- AddColumn ministryId to RoomBooking (required)
ALTER TABLE "RoomBooking" ADD COLUMN "ministryId" TEXT NOT NULL DEFAULT '';

-- AddColumn ministryId to AuditLog (nullable)
ALTER TABLE "AuditLog" ADD COLUMN "ministryId" TEXT;

-- CreateIndex on Ministry unique columns
CREATE UNIQUE INDEX "Ministry_name_key" ON "Ministry"("name");
CREATE UNIQUE INDEX "Ministry_code_key" ON "Ministry"("code");

-- CreateIndex on Room per-ministry unique name
CREATE UNIQUE INDEX "Room_ministryId_name_key" ON "Room"("ministryId", "name");

-- DropIndex old global Room.name unique constraint
DROP INDEX IF EXISTS "Room_name_key";

-- CreateIndex for foreign key lookups
CREATE INDEX "Event_ministryId_idx" ON "Event"("ministryId");
CREATE INDEX "EventSeries_ministryId_idx" ON "EventSeries"("ministryId");
CREATE INDEX "Room_ministryId_idx" ON "Room"("ministryId");
CREATE INDEX "RoomBooking_ministryId_idx" ON "RoomBooking"("ministryId");
CREATE INDEX "AuditLog_ministryId_idx" ON "AuditLog"("ministryId");

-- AddForeignKey User to Ministry
ALTER TABLE "User" ADD CONSTRAINT "User_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Event to Ministry
ALTER TABLE "Event" ADD CONSTRAINT "Event_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey EventSeries to Ministry
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Room to Ministry
ALTER TABLE "Room" ADD CONSTRAINT "Room_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey RoomBooking to Ministry
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey AuditLog to Ministry (nullable, onDelete SetNull)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
