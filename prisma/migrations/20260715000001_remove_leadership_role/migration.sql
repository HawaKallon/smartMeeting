-- Remove LEADERSHIP role from SystemRole enum
-- Note: LEADERSHIP was removed from the schema. This migration is a no-op as the
-- enum change requires manual intervention due to PostgreSQL limitations.
-- The application code has been updated to not use LEADERSHIP anywhere.
SELECT 1;
