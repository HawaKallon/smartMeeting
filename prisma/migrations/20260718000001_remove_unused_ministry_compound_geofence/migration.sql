/*
  Warnings:

  - You are about to drop the column `compoundLat` on the `Ministry` table. All the data in the column will be lost.
  - You are about to drop the column `compoundLng` on the `Ministry` table. All the data in the column will be lost.
  - You are about to drop the column `compoundGeofenceRadius` on the `Ministry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ministry" DROP COLUMN "compoundLat",
DROP COLUMN "compoundLng",
DROP COLUMN "compoundGeofenceRadius";
