-- Simplify MinutesStatus enum (drop SUBMITTED) and remove submission workflow fields
-- Remaps any SUBMITTED minutes to DRAFT

CREATE TYPE "MinutesStatus_new" AS ENUM ('DRAFT', 'PUBLISHED');

-- Remap SUBMITTED rows to DRAFT and drop the submission tracking columns
ALTER TABLE "Minutes"
  ALTER COLUMN "status" TYPE "MinutesStatus_new" USING (
    CASE "status"::text
      WHEN 'SUBMITTED' THEN 'DRAFT'
      ELSE "status"::text
    END::"MinutesStatus_new"
  );

DROP TYPE "MinutesStatus";

ALTER TYPE "MinutesStatus_new" RENAME TO "MinutesStatus";

-- Drop the submission tracking columns
ALTER TABLE "Minutes" DROP COLUMN "submittedById";
ALTER TABLE "Minutes" DROP COLUMN "submittedAt";
