-- Restructure SystemRole enum from 7 values to 5 (SUPER_ADMIN, MINISTER, MINISTRY_ADMIN, LEADERSHIP, STAFF)
-- Remaps old roles: EVENT_MANAGER/EXECUTIVE_ASSISTANT → STAFF, APPROVER/EXECUTIVE_VIEWER → LEADERSHIP

CREATE TYPE "SystemRole_new" AS ENUM ('SUPER_ADMIN','MINISTER','MINISTRY_ADMIN','LEADERSHIP','STAFF');

ALTER TABLE "User" ALTER COLUMN "systemRole" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "systemRole" TYPE "SystemRole_new" USING (
  CASE "systemRole"::text
    WHEN 'EVENT_MANAGER' THEN 'STAFF'
    WHEN 'EXECUTIVE_ASSISTANT' THEN 'STAFF'
    WHEN 'APPROVER' THEN 'LEADERSHIP'
    WHEN 'EXECUTIVE_VIEWER' THEN 'LEADERSHIP'
    ELSE "systemRole"::text
  END::"SystemRole_new"
);

DROP TYPE "SystemRole";

ALTER TYPE "SystemRole_new" RENAME TO "SystemRole";

ALTER TABLE "User" ALTER COLUMN "systemRole" SET DEFAULT 'STAFF';

-- Enforce one MINISTER per ministry
CREATE UNIQUE INDEX "User_one_minister_per_ministry"
  ON "User" ("ministryId") WHERE "systemRole" = 'MINISTER';
