"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Hand-rolled month calendar grid (no dependency). Mirrors the grid math used
 * by the main calendar page (src/app/(app)/calendar/page.tsx). Pure Tailwind so
 * it themes correctly in dark mode — unlike the native date picker popup.
 */
export function MonthCalendar({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = new Date();
  const initial = selected ?? today;
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });

  const start = new Date(view.y, view.m, 1);
  const firstWeekday = start.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = start.toLocaleString("default", { month: "long", year: "numeric" });
  const prev = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  return (
    <div className="w-64">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={next}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-xs font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const cellDate = new Date(view.y, view.m, d);
          const isSelected = selected && sameDay(cellDate, selected);
          const isToday = sameDay(cellDate, today);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(cellDate)}
              className={`flex h-8 items-center justify-center rounded-md text-sm transition-colors ${
                isSelected
                  ? "bg-foreground font-medium text-background"
                  : isToday
                    ? "text-blue-400 hover:bg-muted"
                    : "text-foreground hover:bg-muted"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
