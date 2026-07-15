-- Remove LEADERSHIP role from SystemRole enum
-- Remaps existing LEADERSHIP users to STAFF

CREATE TYPE "SystemRole_new" AS ENUM ('SUPER_ADMIN', 'MINISTER', 'MINISTRY_ADMIN', 'STAFF');

ALTER TABLE "User" ALTER COLUMN "systemRole" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "systemRole" TYPE "SystemRole_new" USING (
  CASE "systemRole"::text
    WHEN 'LEADERSHIP' THEN 'STAFF'
    ELSE "systemRole"::text
  END::"SystemRole_new"
);

DROP TYPE "SystemRole";

ALTER TYPE "SystemRole_new" RENAME TO "SystemRole";

ALTER TABLE "User" ALTER COLUMN "systemRole" SET DEFAULT 'STAFF';
