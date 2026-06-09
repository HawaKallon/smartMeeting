-- AlterTable
ALTER TABLE "User" ADD COLUMN     "actionItemNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoDeleteRecordings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "compactMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "meetingReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'dark';
