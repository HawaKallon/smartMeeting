import { requireUser } from "@/lib/guard";
import { EventForm } from "./EventForm";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const superAdmin = isSuperAdmin(user.systemRole);

  const { date } = await searchParams;
  // Only accept a well-formed YYYY-MM-DD prefill (e.g. from the calendar).
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  const [rooms, ministries] = await Promise.all([
    prisma.room.findMany({
      where: superAdmin ? { ministry: { active: true } } : { ministryId: user.ministryId! },
      orderBy: { name: "asc" },
      select: { id: true, name: true, location: true, capacity: true, ministryId: true },
    }),
    superAdmin
      ? prisma.ministry.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            compoundLat: true,
            compoundLng: true,
            compoundGeofenceRadius: true,
            compoundMaxGpsAccuracy: true,
          },
        })
      : prisma.ministry.findMany({
          where: { id: user.ministryId! },
          select: {
            id: true,
            name: true,
            code: true,
            compoundLat: true,
            compoundLng: true,
            compoundGeofenceRadius: true,
            compoundMaxGpsAccuracy: true,
          },
        }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/administrative" label="Dashboard" />
        <h1 className="mt-4 text-3xl font-bold text-foreground">Schedule an Activity</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <EventForm rooms={rooms} ministries={ministries} isSuperAdmin={superAdmin} initialDate={initialDate} />
      </div>
    </div>
  );
}
