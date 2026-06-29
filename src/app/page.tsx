import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PublicCalendarShell } from "@/components/PublicCalendarShell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_COLORS: Record<string, string> = {
  conference: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  meeting: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  announcement: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  workshop: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  training: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

function getCategoryColor(category?: string | null): string {
  if (!category) return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  return CATEGORY_COLORS[category.toLowerCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
}

export default async function PublicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;

  const today = new Date();
  const year = sp.y ? Number(sp.y) : today.getFullYear();
  const month = sp.m ? Number(sp.m) : today.getMonth();

  const { start, end } = monthBounds(year, month);

  const events = await prisma.publicEvent.findMany({
    where: {
      status: "PUBLISHED",
      startAt: { gte: start, lt: end },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      category: true,
      startAt: true,
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
    <PublicCalendarShell>
      <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">{monthLabel}</h2>
          <div className="flex gap-2">
            <Link
              href={`/?y=${prev.y}&m=${prev.m}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="px-3 py-1 rounded-lg border border-border bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Today
            </Link>
            <Link
              href={`/?y=${next.y}&m=${next.m}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => (
            <Link
              key={idx}
              href={day ? `/public-calendar/day?d=${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "#"}
              className={`min-h-24 rounded-lg border p-2 transition-colors ${
                day
                  ? "border-border bg-card hover:bg-muted cursor-pointer"
                  : "border-transparent bg-transparent cursor-default"
              }`}
            >
              {day && (
                <>
                  <div className="text-sm font-semibold text-foreground mb-1">{day}</div>
                  <div className="space-y-1">
                    {(byDay.get(day) || []).map((event) => (
                      <Link
                        key={event.id}
                        href={`/public-calendar/event/${event.id}`}
                        className="block text-xs truncate rounded px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:opacity-80 transition-opacity"
                      >
                        {event.title}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </Link>
          ))}
        </div>
      </div>
      </div>
    </PublicCalendarShell>
  );
}
