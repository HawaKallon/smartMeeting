import { z } from "zod";

export const PUBLIC_CALENDAR_TIME_ZONE = "Africa/Freetown";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .transform((value) => value || null)
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "External link must be a valid HTTP or HTTPS URL" },
  );

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .transform((value) => value || null)
  .refine((value) => !value || z.email().safeParse(value).success, {
    message: "Enter a valid contact email",
  });

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid date and time")
  .transform((value) => new Date(`${value}:00Z`))
  .refine((value) => !Number.isNaN(value.getTime()), "Enter a valid date and time");

export const PublicEventFormSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
    description: optionalText(5000),
    category: optionalText(50),
    startAt: localDateTime,
    endAt: localDateTime,
    venueName: optionalText(200),
    externalUrl: optionalUrl,
    contactEmail: optionalEmail,
    contactPhone: optionalText(30),
  })
  .refine((value) => value.endAt > value.startAt, {
    path: ["endAt"],
    message: "End time must be after start time",
  });

export type PublicEventFormState = { error?: string };

export function publicEventInput(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    venueName: formData.get("venueName"),
    externalUrl: formData.get("externalUrl"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
  };
}

export function monthBounds(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

export function selectedMonth(y?: string, m?: string) {
  const now = new Date();
  const fallback = { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  if (y === undefined && m === undefined) return fallback;
  const year = Number(y);
  const month = Number(m);
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 0 || month > 11) {
    return fallback;
  }
  return { year, month };
}

export function parseDateKey(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

export function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function eventDateKeys(startAt: Date, endAt: Date, rangeStart: Date, rangeEnd: Date) {
  const first = new Date(Math.max(startAt.getTime(), rangeStart.getTime()));
  const lastInstant = new Date(Math.min(endAt.getTime(), rangeEnd.getTime()) - 1);
  let cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()));
  const last = new Date(Date.UTC(lastInstant.getUTCFullYear(), lastInstant.getUTCMonth(), lastInstant.getUTCDate()));
  const keys: string[] = [];
  while (cursor <= last) {
    keys.push(dateKey(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return keys;
}

export const CATEGORY_STYLES = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-amber-100 text-amber-900 border-amber-200",
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-cyan-100 text-cyan-900 border-cyan-200",
] as const;

export function categoryStyle(category: string | null) {
  if (!category) return "bg-slate-100 text-slate-700 border-slate-200";
  let hash = 0;
  for (const char of category.trim().toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return CATEGORY_STYLES[hash % CATEGORY_STYLES.length];
}

export const publicDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: PUBLIC_CALENDAR_TIME_ZONE,
  dateStyle: "full",
  timeStyle: "short",
});

export const publicTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: PUBLIC_CALENDAR_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
