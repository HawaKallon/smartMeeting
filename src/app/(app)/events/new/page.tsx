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
    <div className="flex flex-col h-full space-y-4">
      <BackButton href="/" label="Dashboard" />
      <h1 className="text-2xl font-bold text-foreground">New Event</h1>
      <div className="flex-1 rounded-xl border border-border bg-card p-6 overflow-y-auto">
        <EventForm rooms={rooms} />
      </div>
    </div>
  );
}
