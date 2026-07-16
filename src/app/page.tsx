import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PublicCalendarShell } from "@/components/PublicCalendarShell";
import type { PublicEventCategory } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Public Events Calendar | Government of Sierra Leone",
  description: "Official public events and announcements from the Government of Sierra Leone.",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_COLORS: Record<PublicEventCategory, string> = {
  CONFERENCE: "border-[#c9d9f2] bg-[#edf3fd] text-[#003580]",
  MEETING: "border-[#cfe5d7] bg-[#edf8f1] text-[#007236]",
  ANNOUNCEMENT: "border-[#fde8a6] bg-[#fff7dd] text-[#9a6800]",
  WORKSHOP: "border-[#c9d9f2] bg-[#eef4ff] text-[#003580]",
  TRAINING: "border-[#fde8a6] bg-[#fff8e5] text-[#8d6400]",
  PUBLIC_NOTICE: "border-[#fde8a6] bg-[#fff7dd] text-[#9a6800]",
  OTHER: "border-slate-200 bg-slate-50 text-slate-700",
};

function monthBounds(year: number, month: number) {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  };
}

function categoryColor(category?: PublicEventCategory | null) {
  if (!category) return "border-slate-200 bg-slate-50 text-slate-700";
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
}

export default async function PublicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date();
  const requestedYear = Number(sp.y);
  const requestedMonth = Number(sp.m);
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
    ? requestedYear
    : today.getFullYear();
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 0 && requestedMonth <= 11
    ? requestedMonth
    : today.getMonth();
  const { start, end } = monthBounds(year, month);

  const events = await prisma.event.findMany({
    where: { isPublic: true,
        status: "PUBLISHED", startAt: { gte: start, lt: end } },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      category: true,
      startAt: true,
      venueName: true,
    },
  });

  const byDay = new Map<number, typeof events>();
  for (const event of events) {
    const day = event.startAt.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  }

  const cells: (number | null)[] = [];
  for (let index = 0; index < start.getDay(); index++) cells.push(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = start.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const selectedMonthIsCurrent = year === today.getFullYear() && month === today.getMonth();
  const datePath = (day: number) =>
    `/public-calendar/day?d=${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <PublicCalendarShell>
      <div className="w-full space-y-8">
      <section className="rounded-[2rem] border border-[#d3deef] bg-[#fafdff] px-6 py-7 shadow-[0_24px_70px_rgba(0,53,128,0.08)] lg:px-8">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Public information</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#003580] sm:text-5xl">
            Events and official announcements
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            View upcoming government events, conferences, workshops, and public notices through the official public calendar of the Government of Sierra Leone.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#d3deef] bg-[#fafdff] shadow-[0_24px_70px_rgba(0,53,128,0.08)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calendar month</p>
            <h3 className="mt-1 text-2xl font-bold text-[#003580]">{monthLabel}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {events.length} published event{events.length === 1 ? "" : "s"}
            </p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Calendar month navigation">
            <Link
              href={`/?y=${prev.y}&m=${prev.m}`}
              aria-label="Previous month"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-[#f9fbff] text-slate-600 transition hover:border-[#003580] hover:text-[#003580]"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-[#f9fbff] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#003580] hover:text-[#003580]"
            >
              Today
            </Link>
            <Link
              href={`/?y=${next.y}&m=${next.m}`}
              aria-label="Next month"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-[#f9fbff] text-slate-600 transition hover:border-[#003580] hover:text-[#003580]"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </nav>
        </div>

        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-slate-200 gap-px">
            {cells.map((day, index) => {
              const dayEvents = day ? byDay.get(day) ?? [] : [];
              const isToday = Boolean(day && selectedMonthIsCurrent && day === today.getDate());
              return (
                <div key={`${day ?? "empty"}-${index}`} className={`min-h-36 p-2.5 ${day ? "bg-[#fafdff]" : "bg-[#eef4fc]"}`}>
                  {day ? (
                    <>
                      <Link
                        href={datePath(day)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                          isToday ? "bg-[#007236] text-white" : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {day}
                      </Link>
                      <div className="mt-2 space-y-1.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <Link
                            key={event.id}
                            href={`/public-calendar/event/${event.id}`}
                            className={`block truncate rounded border px-2 py-1.5 text-xs font-semibold transition hover:brightness-95 ${categoryColor(event.category)}`}
                            title={event.title}
                          >
                            {event.title}
                          </Link>
                        ))}
                        {dayEvents.length > 3 ? (
                          <Link href={datePath(day)} className="block px-1 text-xs font-semibold text-[#003580] hover:underline">
                            +{dayEvents.length - 3} more
                          </Link>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-slate-200 md:hidden">
          {events.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">No published events this month</p>
              <p className="mt-1 text-sm text-slate-500">Use the arrows above to view another month.</p>
            </div>
          ) : (
            events.map((event) => (
              <Link
                key={event.id}
                href={`/public-calendar/event/${event.id}`}
                className="flex gap-4 px-5 py-4 transition hover:bg-slate-50"
              >
                <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#003580] text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-100">
                    {event.startAt.toLocaleString("en-GB", { month: "short" })}
                  </span>
                  <span className="text-xl font-bold">{event.startAt.getDate()}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-[#003580]">{event.title}</span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {event.startAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {event.venueName ? (
                    <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {event.venueName}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
      </div>
    </PublicCalendarShell>
  );
}
