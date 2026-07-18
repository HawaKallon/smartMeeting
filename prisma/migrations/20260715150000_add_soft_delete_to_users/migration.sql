-- Add soft delete support to User table
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
