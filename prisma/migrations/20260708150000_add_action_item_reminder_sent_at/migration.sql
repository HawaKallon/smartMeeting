-- Add one-time 24-hour reminder tracking for action items.
ALTER TABLE "ActionItem" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

CREATE INDEX "ActionItem_reminderSentAt_idx" ON "ActionItem"("reminderSentAt");
