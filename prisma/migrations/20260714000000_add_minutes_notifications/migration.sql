-- Add minutesNotifications column to User table
ALTER TABLE "User" ADD COLUMN "minutesNotifications" BOOLEAN NOT NULL DEFAULT true;
