import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  categoryStyle,
  dateKey,
  eventDateKeys,
  monthBounds,
  publicTime,
  selectedMonth,
} from "@/lib/publicEvents";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const dynamic = "force-dynamic";

export default async function PublicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const { year, month } = selectedMonth(params.y, params.m);
  const { start, end } = monthBounds(year, month);
  const today = new Date();

  const events = await prisma.publicEvent.findMany({
    where: { status: "PUBLISHED", startAt: { lt: end }, endAt: { gt: start } },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      category: true,
      startAt: true,
      endAt: true,
      venueName: true,
    },
  });

  const byDay = new Map<string, typeof events>();
  for (const event of events) {
    for (const key of eventDateKeys(event.startAt, event.endAt, start, end)) {
      const current = byDay.get(key) ?? [];
      current.push(event);
      byDay.set(key, current);
    }
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: start.getUTCDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Public events</h1>
        <p className="mt-2 text-slate-600">Browse official events and public engagements across ministries.</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <h2 className="text-xl font-semibold text-slate-900">{monthLabel}</h2>
          <nav className="flex items-center gap-2" aria-label="Calendar navigation">
            <Link aria-label="Previous month" href={`/public-calendar?y=${prev.y}&m=${prev.m}`} className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href="/public-calendar" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</Link>
            <Link aria-label="Next month" href={`/public-calendar?y=${next.y}&m=${next.m}`} className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px] p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="p-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{weekday}</div>
              ))}
              {cells.map((day, index) => {
                if (day === null) return <div key={`blank-${index}`} className="min-h-32 rounded-lg bg-slate-50" />;
                const key = dateKey(new Date(Date.UTC(year, month, day)));
                const dayEvents = byDay.get(key) ?? [];
                const isToday = today.getUTCFullYear() === year && today.getUTCMonth() === month && today.getUTCDate() === day;
                return (
                  <div key={key} className={`min-h-32 rounded-lg border p-2 ${isToday ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <Link href={`/public-calendar/day?d=${key}`} className={`text-sm font-semibold hover:text-emerald-700 ${isToday ? "text-emerald-800" : "text-slate-700"}`}>{day}</Link>
                      {dayEvents.length > 0 && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">{dayEvents.length}</span>}
                    </div>
                    <div className="space-y-1.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <Link key={event.id} href={`/public-calendar/event/${event.id}`} className={`block rounded-md border px-2 py-1.5 text-xs ${categoryStyle(event.category)}`}>
                          <span className="block truncate font-semibold">{event.title}</span>
                          <span className="mt-0.5 flex items-center gap-1 opacity-80"><Clock className="h-3 w-3" />{publicTime.format(event.startAt)}</span>
                          {event.venueName && <span className="mt-0.5 flex items-center gap-1 truncate opacity-80"><MapPin className="h-3 w-3 shrink-0" />{event.venueName}</span>}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && <Link href={`/public-calendar/day?d=${key}`} className="block px-2 py-1 text-xs font-medium text-emerald-800 hover:underline">+{dayEvents.length - 3} more</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
