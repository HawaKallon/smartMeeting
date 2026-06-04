-- CreateEnum
CREATE TYPE "RoomBookingPurpose" AS ENUM ('MEETING', 'TRAINING', 'CONFERENCE', 'WORKSHOP', 'INTERVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "RoomBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "amenities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBooking" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "purpose" "RoomBookingPurpose" NOT NULL,
    "attendeeCount" INTEGER,
    "notes" TEXT,
    "status" "RoomBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

-- CreateIndex
CREATE INDEX "Room_location_idx" ON "Room"("location");

-- CreateIndex
CREATE INDEX "RoomBooking_userId_idx" ON "RoomBooking"("userId");

-- CreateIndex
CREATE INDEX "RoomBooking_roomId_idx" ON "RoomBooking"("roomId");

-- CreateIndex
CREATE INDEX "RoomBooking_startTime_idx" ON "RoomBooking"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "RoomBooking_roomId_startTime_endTime_key" ON "RoomBooking"("roomId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
