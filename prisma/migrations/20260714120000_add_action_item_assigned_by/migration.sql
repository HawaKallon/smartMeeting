-- Add "assigned by" tracking to ActionItem (who created/reassigned the task)
ALTER TABLE "ActionItem" ADD COLUMN "assignedById" TEXT;

ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ActionItem_assignedById_idx" ON "ActionItem"("assignedById");
