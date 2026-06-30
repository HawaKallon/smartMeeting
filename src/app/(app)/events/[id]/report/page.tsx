import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { canManageExistingEvent } from "@/lib/eventAccess";
import { ReportForm } from "./ReportForm";

export default async function EventReportPage({
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
      startAt: true,
      venueName: true,
      ministryId: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
    },
  });

  if (!event) notFound();
  if (!canManageExistingEvent(user, event)) notFound();

  return (
    <div className="space-y-6">
      <BackButton href={`/administrative/events/${id}`} label={event.title} />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Meeting Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Document the key outcomes and findings from this meeting
        </p>
      </div>

      {/* Event info card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">{event.title}</h2>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>
            📅{" "}
            {event.startAt.toLocaleString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {event.venueName && <p>📍 {event.venueName}</p>}
        </div>
      </div>

      {/* Report form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <ReportForm eventId={id} />
      </div>
    </div>
  );
}
