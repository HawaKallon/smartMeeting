import { requireStaffRole } from "@/lib/guard";
import { EventForm } from "./EventForm";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";

export default async function NewEventPage() {
  await requireStaffRole();

  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true, capacity: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/" label="Dashboard" />
        <h1 className="mt-4 text-3xl font-bold text-foreground">New Event</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <EventForm rooms={rooms} />
      </div>
    </div>
  );
}
