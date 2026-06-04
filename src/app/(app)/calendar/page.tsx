import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canViewMinistrySchedule } from "@/lib/roles";
import { COLOR_META } from "@/lib/colors";

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
  const month = sp.m ? Number(sp.m) : today.getMonth(); // 0-based

  const { start, end } = monthBounds(year, month);

  const events = await prisma.event.findMany({
    where: {
      startAt: { gte: start, lt: end },
      ...(canViewMinistrySchedule(user.role) ? {} : { organizerId: user.id }),
    },
    orderBy: { startAt: "asc" },
  });

  // Group events by day-of-month.
  const byDay = new Map<number, typeof events>();
  for (const e of events) {
    const d = e.startAt.getDate();
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(e);
  }

  // Build grid cells (leading blanks + days).
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{monthLabel}</h1>
        <div className="flex gap-2">
          <Link
            href={`/calendar?y=${prev.y}&m=${prev.m}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Prev
          </Link>
          <Link
            href="/calendar"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Today
          </Link>
          <Link
            href={`/calendar?y=${next.y}&m=${next.m}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-gray-200 text-sm">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-gray-50 px-2 py-2 text-center font-medium text-gray-600">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday =
            day !== null &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const dayEvents = day ? byDay.get(day) ?? [] : [];
          return (
            <div key={i} className="min-h-24 bg-white p-1.5 align-top">
              {day !== null && (
                <>
                  <div
                    className={`mb-1 text-xs ${isToday ? "font-bold text-blue-600" : "text-gray-400"}`}
                  >
                    {day}
                  </div>
                  <ul className="space-y-1">
                    {dayEvents.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/events/${e.id}`}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-gray-100"
                        >
                          {e.colorCategory ? (
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${COLOR_META[e.colorCategory].dot}`}
                            />
                          ) : null}
                          <span className="truncate">{e.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
