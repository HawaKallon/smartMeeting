-- CreateTable
CREATE TABLE "_PublicEventInvites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PublicEventInvites_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PublicEventInvites_B_index" ON "_PublicEventInvites"("B");

-- AddForeignKey
ALTER TABLE "_PublicEventInvites" ADD CONSTRAINT "_PublicEventInvites_A_fkey" FOREIGN KEY ("A") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PublicEventInvites" ADD CONSTRAINT "_PublicEventInvites_B_fkey" FOREIGN KEY ("B") REFERENCES "PublicEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
