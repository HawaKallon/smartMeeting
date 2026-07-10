import Link from "next/link";
import { requireStaffRole, ministryScope } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { COLOR_META } from "@/lib/colors";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { ColorCategory } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

type EventListItem = Prisma.EventGetPayload<{
  select: {
    id: true;
    title: true;
    startAt: true;
    endAt: true;
    description: true;
    type: true;
    colorCategory: true;
    room: { select: { name: true; location: true } };
    venueName: true;
    organizer: { select: { name: true } };
    _count: { select: { attendances: true; attendees: true } };
  };
}>;

export default async function AllEventsPage() {
  const user = await requireStaffRole();

  const now = new Date();

  const events = await prisma.event.findMany({
    where: ministryScope(user),
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      description: true,
      type: true,
      colorCategory: true,
      room: { select: { name: true, location: true } },
      venueName: true,
      organizer: { select: { name: true } },
      _count: { select: { attendances: true, attendees: true } },
    },
  });

  const past = events.filter((e) => e.endAt < now);
  const present = events.filter((e) => e.startAt <= now && e.endAt >= now);
  const upcoming = events.filter((e) => e.startAt > now);

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Event register</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">All Events</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">View all events across past, present, and future</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[1.6rem] border border-[#d3e0f0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-5 py-4 shadow-[0_14px_35px_rgba(15,35,63,0.07)]">
          <p className="text-3xl font-semibold text-[#003580]">{upcoming.length}</p>
          <p className="mt-1 text-xs font-medium text-[#4e678f]">Upcoming Events</p>
        </div>
        <div className="rounded-[1.6rem] border border-[#f0dfaa] bg-[linear-gradient(180deg,#fffef8_0%,#fff5d9_100%)] px-5 py-4 shadow-[0_14px_35px_rgba(15,35,63,0.07)]">
          <p className="text-3xl font-semibold text-[#946200]">{present.length}</p>
          <p className="mt-1 text-xs font-medium text-[#8d6a17]">Happening Now</p>
        </div>
        <div className="rounded-[1.6rem] border border-[#d6dfec] bg-[linear-gradient(180deg,#fbfdff_0%,#f1f5fb_100%)] px-5 py-4 shadow-[0_14px_35px_rgba(15,35,63,0.07)]">
          <p className="text-3xl font-semibold text-[#1f3d67]">{past.length}</p>
          <p className="mt-1 text-xs font-medium text-[#60728d]">Past Events</p>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <EventSection title="Upcoming Events" events={upcoming} />
      )}

      {/* Present Events */}
      {present.length > 0 && (
        <EventSection title="Happening Now" events={present} highlight />
      )}

      {/* Past Events */}
      {past.length > 0 && (
        <EventSection title="Past Events" events={past} />
      )}

      {events.length === 0 && (
        <div className="rounded-[1.75rem] border border-border bg-card px-6 py-12 text-center shadow-[0_16px_40px_rgba(15,35,63,0.07)]">
          <Calendar className="mx-auto h-8 w-8 text-primary/25" />
          <p className="mt-3 text-sm text-muted-foreground">No events found</p>
        </div>
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
  highlight = false,
}: {
  title: string;
  events: EventListItem[];
  highlight?: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-[1.75rem] border shadow-[0_18px_45px_rgba(15,35,63,0.08)] ${highlight ? "border-[#f0dfaa] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8e7_100%)]" : "border-border bg-card"}`}>
      <div className={`border-b px-5 py-4 ${highlight ? "border-[#f0dfaa] bg-[#fff3cf]" : "border-border bg-secondary/50"}`}>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>

      <div className="divide-y divide-border/50">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/administrative/events/${event.id}`}
            className="block px-5 py-4 transition-colors hover:bg-secondary/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {event.colorCategory ? (
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${COLOR_META[event.colorCategory as ColorCategory].dot}`} />
                  ) : (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-muted-foreground/30" />
                  )}
                  <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
                </div>

                {event.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {event.startAt.toLocaleString("en-GB", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {event.room ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.room.name} • {event.room.location}
                    </div>
                  ) : event.venueName ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.venueName}
                    </div>
                  ) : null}

                  {event.organizer && (
                    <div>by {event.organizer.name}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{event._count.attendances}</div>
                  <div className="text-xs text-muted-foreground">checked in</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{event._count.attendees}</div>
                  <div className="text-xs text-muted-foreground">invited</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
