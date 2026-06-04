import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { BookRoomForm } from "./BookRoomForm";

export default async function BookRoomPage() {
  const user = await requireUser();

  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
      location: true,
    },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/rooms" label="Rooms" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Book a Room</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reserve a conference room or open space</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 max-w-2xl">
        <BookRoomForm rooms={rooms} userId={user.id} />
      </div>
    </div>
  );
}
