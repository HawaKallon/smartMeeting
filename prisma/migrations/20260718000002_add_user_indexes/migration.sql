-- Add indexes to User model for faster ministry user queries
CREATE INDEX IF NOT EXISTS "User_ministryId_idx" ON "User"("ministryId");
CREATE INDEX IF NOT EXISTS "User_ministryId_systemRole_idx" ON "User"("ministryId", "systemRole");
