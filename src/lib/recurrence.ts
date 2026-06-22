import type { RecurrenceFrequency, RecurrenceEndType } from "@/generated/prisma/enums";

// PRD §6 — recurring meetings. Pure date math (no DB) that expands a series
// rule into concrete occurrence start/end pairs. Each occurrence becomes its
// own Event row.

export const MAX_OCCURRENCES = 200;

export type RecurrenceRule = {
  startAt: Date;
  endAt: Date;
  frequency: RecurrenceFrequency;
  interval: number;
  endType: RecurrenceEndType;
  count?: number | null;
  until?: Date | null;
};

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Expand a recurrence rule into occurrences (duration held constant). Stops at
 * `count` (COUNT) or once past `until` end-of-day (UNTIL), and is always hard-
 * capped at MAX_OCCURRENCES.
 */
export function generateOccurrences(rule: RecurrenceRule): { startAt: Date; endAt: Date }[] {
  const { startAt, endAt, frequency } = rule;
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const durationMs = endAt.getTime() - startAt.getTime();
  const untilCutoff = rule.endType === "UNTIL" && rule.until ? endOfDay(rule.until).getTime() : null;
  const target = rule.endType === "COUNT" ? Math.max(1, Math.floor(rule.count ?? 1)) : MAX_OCCURRENCES;
  const cap = Math.min(target, MAX_OCCURRENCES);

  const occ: { startAt: Date; endAt: Date }[] = [];
  const push = (s: Date) => occ.push({ startAt: s, endAt: new Date(s.getTime() + durationMs) });

  if (frequency === "MONTHLY") {
    const dom = startAt.getDate();
    // Walk months; skip any month that lacks the start day-of-month (e.g. 31st).
    for (let k = 0; occ.length < cap && k <= MAX_OCCURRENCES * 2; k++) {
      const cand = new Date(
        startAt.getFullYear(),
        startAt.getMonth() + k * interval,
        dom,
        startAt.getHours(),
        startAt.getMinutes(),
        0,
        0,
      );
      if (cand.getDate() !== dom) continue; // rolled over → month has no such day
      if (untilCutoff !== null && cand.getTime() > untilCutoff) break;
      push(cand);
    }
    return occ;
  }

  // DAILY / WEEKLY / WEEKDAYS — walk day by day.
  let cursor = new Date(startAt);
  let guard = 0;
  while (occ.length < cap && guard++ < MAX_OCCURRENCES * 10) {
    if (frequency === "WEEKDAYS") {
      const dow = cursor.getDay();
      if (dow === 0 || dow === 6) {
        cursor = addDays(cursor, 1);
        continue;
      }
    }
    if (untilCutoff !== null && cursor.getTime() > untilCutoff) break;
    push(new Date(cursor));

    if (frequency === "DAILY") cursor = addDays(cursor, interval);
    else if (frequency === "WEEKLY") cursor = addDays(cursor, 7 * interval);
    else cursor = addDays(cursor, 1); // WEEKDAYS
  }
  return occ;
}

/** Human-readable summary for badges, e.g. "Repeats weekly until 31 Dec 2026". */
export function describeRecurrence(r: {
  frequency: RecurrenceFrequency;
  interval: number;
  endType: RecurrenceEndType;
  count?: number | null;
  until?: Date | null;
}): string {
  const n = Math.max(1, r.interval || 1);
  let base: string;
  switch (r.frequency) {
    case "DAILY":
      base = n === 1 ? "daily" : `every ${n} days`;
      break;
    case "WEEKLY":
      base = n === 1 ? "weekly" : `every ${n} weeks`;
      break;
    case "WEEKDAYS":
      base = "every weekday";
      break;
    case "MONTHLY":
      base = n === 1 ? "monthly" : `every ${n} months`;
      break;
    default:
      base = "";
  }
  let end = "";
  if (r.endType === "COUNT" && r.count) end = `, ${r.count} times`;
  else if (r.endType === "UNTIL" && r.until)
    end = ` until ${r.until.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  return `Repeats ${base}${end}`;
}
