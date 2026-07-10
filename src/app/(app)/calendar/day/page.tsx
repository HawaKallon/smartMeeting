import Link from "next/link";
import { requireUser, ministryScope } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canViewMinistrySchedule, canManageEvents } from "@/lib/roles";
import { COLOR_META } from "@/lib/colors";
import { BackButton } from "@/components/BackButton";
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus, Repeat } from "lucide-react";

export default async function CalendarDayPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const today = new Date();
  let selectedDate = new Date(today);

  if (sp.d) {
    const [year, month, day] = sp.d.split("-").map(Number);
    selectedDate = new Date(year, month - 1, day);
  }

  const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      startAt: { gte: startOfDay, lt: endOfDay },
      ...ministryScope(user),
      ...(canViewMinistrySchedule(user.systemRole) ? {} : { organizerId: user.id }),
    },
    orderBy: { startAt: "asc" },
    include: {
      room: { select: { name: true, location: true } },
      organizer: { select: { name: true, email: true } },
      _count: { select: { attendees: true, attendances: true } },
    },
  });

  const dateLabel = selectedDate.toLocaleString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isToday =
    today.getFullYear() === selectedDate.getFullYear() &&
    today.getMonth() === selectedDate.getMonth() &&
    today.getDate() === selectedDate.getDate();

  const prevDate = new Date(selectedDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;

  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const canAdd = canManageEvents(user.systemRole);

  return (
    <div className="space-y-6">
      <BackButton href="/administrative/calendar" label="Calendar" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">{dateLabel}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""} scheduled
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Link
          href={`/administrative/calendar/day?d=${prevDateStr}`}
          className="flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>

        {!isToday && (
          <Link
            href={`/administrative/calendar/day?d=${todayStr}`}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            Today
          </Link>
        )}

        <Link
          href={`/administrative/calendar/day?d=${nextDateStr}`}
          className="flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No events scheduled for this day</p>
          {canAdd && (
            <Link
              href={`/administrative/events/new?date=${selectedDateStr}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Schedule Activity
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const categoryColor = event.colorCategory
              ? COLOR_META[event.colorCategory]
              : null;
            const startTime = event.startAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const endTime = event.endAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const duration = Math.round((event.endAt.getTime() - event.startAt.getTime()) / 60000);
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            const durationStr =
              hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            return (
              <Link
                key={event.id}
                href={`/administrative/events/${event.id}`}
                className="block rounded-lg border border-border bg-card p-6 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {categoryColor && (
                        <span
                          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${categoryColor.dot}`}
                        />
                      )}
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                        {event.title}
                      </h3>
                      {event.seriesId && (
                        <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Recurring" />
                      )}
                    </div>

                    {event.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {startTime} - {endTime} ({durationStr})
                        </span>
                      </div>

                      {event.room && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{event.room.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>
                          {event._count.attendances}/{event._count.attendees} attended
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Organized by{" "}
                      <span className="font-medium">{event.organizer.name || event.organizer.email}</span>
                    </div>
                  </div>

                  {categoryColor && (
                    <div className="flex-shrink-0 rounded-lg px-3 py-1 text-xs font-medium bg-red-500/10 text-red-400">
                      {categoryColor.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
