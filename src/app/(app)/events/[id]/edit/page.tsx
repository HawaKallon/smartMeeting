import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { canManageEvent } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { EditEventForm } from "./EditEventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      scope: true,
      classification: true,
      roomId: true,
      geofenceRadius: true,
      startAt: true,
      endAt: true,
      colorCategory: true,
      seriesId: true,
      ministryId: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
      series: { select: { frequency: true, interval: true, endType: true, count: true, until: true } },
    },
  });

  if (!event) notFound();

  // Organizer, their co-organizers, and ministry ADMINs may edit.
  if (
    !canManageEvent(user, {
      ministryId: event.ministryId,
      organizerId: event.organizerId,
      coOrganizerIds: event.coOrganizers.map((c) => c.id),
    })
  ) {
    redirect("/administrative/forbidden");
  }

  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true, capacity: true },
  });

  return (
    <div className="space-y-6">
      <BackButton href={`/administrative/events/${id}`} label={event.title} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update event details</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <EditEventForm event={event} rooms={rooms} />
      </div>
    </div>
  );
}
