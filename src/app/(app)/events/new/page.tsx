import { requireStaffRole } from "@/lib/guard";
import { EventForm } from "./EventForm";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireStaffRole();

  const { date } = await searchParams;
  // Only accept a well-formed YYYY-MM-DD prefill (e.g. from the calendar).
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

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
        <EventForm rooms={rooms} initialDate={initialDate} />
      </div>
    </div>
  );
}
