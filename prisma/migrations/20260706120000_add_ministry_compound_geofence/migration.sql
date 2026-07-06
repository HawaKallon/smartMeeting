ALTER TABLE "Ministry"
ADD COLUMN "compoundLat" DOUBLE PRECISION,
ADD COLUMN "compoundLng" DOUBLE PRECISION,
ADD COLUMN "compoundGeofenceRadius" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "compoundMaxGpsAccuracy" INTEGER NOT NULL DEFAULT 75;

UPDATE "Ministry" AS m
SET
  "compoundLat" = r."latitude",
  "compoundLng" = r."longitude"
FROM (
  SELECT DISTINCT ON ("ministryId")
    "ministryId",
    "latitude",
    "longitude"
  FROM "Room"
  WHERE "latitude" IS NOT NULL
    AND "longitude" IS NOT NULL
  ORDER BY "ministryId", "createdAt" ASC
) AS r
WHERE r."ministryId" = m."id"
  AND m."compoundLat" IS NULL
  AND m."compoundLng" IS NULL;
