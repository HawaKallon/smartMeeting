-- AlterEnum
ALTER TYPE "MinutesStatus" ADD VALUE 'SUBMITTED';

-- AlterTable
ALTER TABLE "Minutes" ADD COLUMN     "draftedById" TEXT,
ADD COLUMN     "draftedAt" TIMESTAMP(3),
ADD COLUMN     "submittedById" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Minutes" ADD CONSTRAINT "Minutes_draftedById_fkey" FOREIGN KEY ("draftedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Minutes" ADD CONSTRAINT "Minutes_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
