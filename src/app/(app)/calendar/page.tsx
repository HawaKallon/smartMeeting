import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canViewMinistrySchedule, canManageEvents } from "@/lib/roles";
import { COLOR_META } from "@/lib/colors";
import { BackButton } from "@/components/BackButton";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const today = new Date();
  const year = sp.y ? Number(sp.y) : today.getFullYear();
  const month = sp.m ? Number(sp.m) : today.getMonth();

  const { start, end } = monthBounds(year, month);

  const events = await prisma.event.findMany({
    where: {
      startAt: { gte: start, lt: end },
      ...(canViewMinistrySchedule(user.role) ? {} : { organizerId: user.id }),
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      colorCategory: true,
      room: { select: { name: true } },
    },
  });

  const byDay = new Map<number, typeof events>();
  for (const e of events) {
    const d = e.startAt.getDate();
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(e);
  }

  const firstWeekday = start.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = start.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View all upcoming events • <span className="text-blue-400">Click any date to see day view</span>
          </p>
        </div>
        {canManageEvents(user.role) && (
          <Link
            href="/events/new"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">{monthLabel}</h2>
          <div className="flex gap-2">
            <Link
              href={`/calendar?y=${prev.y}&m=${prev.m}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/calendar"
              className="px-3 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Today
            </Link>
            <Link
              href={`/calendar?y=${next.y}&m=${next.m}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {WEEKDAYS.map((w) => (
            <div key={w} className="p-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {w}
              </p>
            </div>
          ))}

          {/* Day cells */}
          {cells.map((day, i) => {
            const isToday =
              day !== null &&
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            const dayEvents = day ? byDay.get(day) ?? [] : [];
            const hasEvents = dayEvents.length > 0;
            const displayEvents = dayEvents.slice(0, 3);
            const moreCount = Math.max(0, dayEvents.length - 3);

            return (
              <div
                key={i}
                className={`rounded-lg border p-2 min-h-32 transition-colors ${
                  day === null
                    ? "bg-background border-background"
                    : isToday
                      ? "border-blue-500/50 bg-blue-500/10"
                      : hasEvents
                        ? "border-border/80 bg-muted/30 hover:bg-muted/50"
                        : "border-border/30 hover:border-border/60 hover:bg-muted/20"
                }`}
              >
                {day !== null && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/calendar/day?d=${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
                        className={`text-sm font-semibold hover:text-blue-400 transition-colors ${
                          isToday
                            ? "text-blue-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </Link>
                      {hasEvents && (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs font-medium text-blue-400">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    {hasEvents && (
                      <div className="space-y-1">
                        {displayEvents.map((e) => {
                          const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
                            RED: { bg: "bg-red-500/20", text: "text-red-400", dot: "bg-red-500" },
                            AMBER: { bg: "bg-amber-500/20", text: "text-amber-400", dot: "bg-amber-500" },
                            GREEN: { bg: "bg-green-500/20", text: "text-green-400", dot: "bg-green-500" },
                          };
                          const colors = e.colorCategory && colorMap[e.colorCategory]
                            ? colorMap[e.colorCategory]
                            : { bg: "bg-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" };
                          const bgColor = colors.bg;
                          const textColor = colors.text;
                          const dotColor = colors.dot;
                          const time = e.startAt.toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <Link
                              key={e.id}
                              href={`/events/${e.id}`}
                              className={`block truncate rounded px-2 py-1.5 text-xs font-medium transition-all hover:shadow-md group ${bgColor} ${textColor}`}
                              title={e.title}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className={`h-1 w-1 flex-shrink-0 rounded-full ${dotColor}`} />
                                <span className="truncate group-hover:font-semibold">
                                  {e.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 text-xs opacity-75 mt-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="truncate">{time}</span>
                                {e.room && (
                                  <span className="truncate text-xs">
                                    • {e.room.name}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                        {moreCount > 0 && (
                          <button
                            className="w-full text-xs text-muted-foreground/70 hover:text-muted-foreground px-2 py-1 rounded hover:bg-muted/30 transition-colors"
                          >
                            +{moreCount} more event{moreCount !== 1 ? "s" : ""}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
