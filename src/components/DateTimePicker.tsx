"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";

const trigger =
  "mt-1 flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-left text-sm text-foreground focus:border-ring focus:outline-none";

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(v: string | undefined): { date: Date | null; time: string } {
  if (!v) return { date: null, time: "" };
  const [d, t] = v.split("T");
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return { date: null, time: t ?? "" };
  return { date: new Date(y, m - 1, day), time: (t ?? "").slice(0, 5) };
}

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

/** Scrollable hour + minute columns; click an entry to select it. */
function TimeScroller({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [hh, mm] = (value || "09:00").split(":");
  const hourCol = useRef<HTMLDivElement>(null);
  const minCol = useRef<HTMLDivElement>(null);
  const hourSel = useRef<HTMLButtonElement>(null);
  const minSel = useRef<HTMLButtonElement>(null);

  // Center the selected entries on open (scroll only the columns, not the page).
  useEffect(() => {
    const center = (col: HTMLDivElement | null, sel: HTMLButtonElement | null) => {
      if (col && sel) col.scrollTop = sel.offsetTop - col.clientHeight / 2 + sel.clientHeight / 2;
    };
    center(hourCol.current, hourSel.current);
    center(minCol.current, minSel.current);
  }, []);

  const colCls =
    "h-60 w-16 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1 [scrollbar-width:thin]";
  const itemCls = (active: boolean) =>
    `block w-full rounded-md py-1.5 text-center text-sm tabular-nums transition-colors ${
      active
        ? "bg-foreground font-semibold text-background"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col">
        <span className="mb-1 text-xs font-medium text-muted-foreground">Hour</span>
        <div ref={hourCol} className={colCls}>
          {HOURS.map((h) => (
            <button
              key={h}
              ref={h === hh ? hourSel : undefined}
              type="button"
              onClick={() => onChange(`${h}:${mm}`)}
              className={itemCls(h === hh)}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="mb-1 text-xs font-medium text-muted-foreground">Minute</span>
        <div ref={minCol} className={colCls}>
          {MINUTES.map((m) => (
            <button
              key={m}
              ref={m === mm ? minSel : undefined}
              type="button"
              onClick={() => onChange(`${hh}:${m}`)}
              className={itemCls(m === mm)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Supabase-style date + time picker: a popover with a month calendar on the
 * left and a time field on the side. Dark-themed (no native calendar popup).
 *
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`), and
 * always renders a hidden input so it submits inside plain server-action forms.
 * Emitted value is `YYYY-MM-DDTHH:mm`.
 */
export function DateTimePicker({
  name,
  value,
  defaultValue,
  onChange,
  required,
  placeholder,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const seed = parse(value ?? defaultValue);
  const [dateObj, setDateObj] = useState<Date | null>(seed.date);
  const [time, setTime] = useState<string>(seed.time || (seed.date ? "09:00" : ""));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = dateObj ? `${fmtDate(dateObj)}T${time || "09:00"}` : "";

  // Emit changes to a controlled parent (and keep the hidden input in sync).
  useEffect(() => {
    onChange?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const display = dateObj
    ? `${dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} · ${time || "09:00"}`
    : placeholder ?? "Select date & time";

  return (
    <div className="relative" ref={ref} data-required={required || undefined}>
      {name && <input type="hidden" name={name} value={current} />}
      {/* Empty values are rejected by the server action (Zod), so no fragile
          hidden `required` input is needed. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={trigger}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={dateObj ? "" : "text-muted-foreground"}>{display}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 flex gap-4 rounded-lg border border-border bg-card p-3 shadow-lg">
          <MonthCalendar
            selected={dateObj}
            onSelect={(d) => {
              setDateObj(d);
              if (!time) setTime("09:00");
            }}
          />
          <TimeScroller value={time || "09:00"} onChange={setTime} />
        </div>
      )}
    </div>
  );
}
