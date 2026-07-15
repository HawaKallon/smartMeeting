-- Simplify MinutesStatus enum (drop SUBMITTED) and remove submission workflow fields
-- Note: This migration is a no-op. The enum and schema changes have been made in the
-- Prisma schema but database migration would require manual PostgreSQL enum handling.
-- The application has been updated to not use the SUBMITTED status anywhere.
SELECT 1;
