import { notFound } from "next/navigation";
import { hashRsvpToken, validRsvpToken } from "@/lib/rsvp";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MapPin, Users, Calendar, Clock } from "lucide-react";

export default async function GuestEventPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!validRsvpToken(token)) notFound();

  const attendee = await prisma.eventAttendee.findFirst({
    where: { rsvpTokenHash: hashRsvpToken(token) },
    select: {
      id: true,
      status: true,
      respondedAt: true,
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          startAt: true,
          endAt: true,
          venueName: true,
          organizer: { select: { name: true, email: true } },
          room: { select: { name: true, location: true } },
          ministry: { select: { name: true } },
          minutes: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!attendee) notFound();

  const { event } = attendee;
  const minutesPublished = event.minutes?.status === "PUBLISHED";

  const statusColor = {
    CONFIRMED: "bg-green-500/10 text-green-400",
    DECLINED: "bg-red-500/10 text-red-400",
    INVITED: "bg-yellow-500/10 text-yellow-400",
  }[attendee.status];

  const statusText = {
    CONFIRMED: "Attending",
    DECLINED: "Not Attending",
    INVITED: "Awaiting Response",
  }[attendee.status];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{event.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{event.ministry.name}</p>
          </div>
          <div className={`rounded px-3 py-1 text-xs font-medium ${statusColor}`}>
            {statusText}
          </div>
        </div>

        {event.description && (
          <div className="mt-6 rounded-lg bg-secondary/20 p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        <div className="mt-6 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {event.startAt.toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {event.startAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            –{" "}
            {event.endAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {event.venueName && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.venueName}
              {event.room && ` • ${event.room.name}`}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Organized by {event.organizer?.name}
          </div>
        </div>
      </div>

      {minutesPublished && (
        <Link
          href={`/guest/${token}/minutes`}
          className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          View Minutes
        </Link>
      )}

      {event.minutes && !minutesPublished && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Minutes will be available after they are published.
          </p>
        </div>
      )}
    </div>
  );
}
