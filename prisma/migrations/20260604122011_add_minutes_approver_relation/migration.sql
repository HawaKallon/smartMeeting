-- AddForeignKey
ALTER TABLE "Minutes" ADD CONSTRAINT "Minutes_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
