"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";

const trigger =
  "mt-1 flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-left text-sm text-foreground focus:border-ring focus:outline-none";

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(v: string | undefined): Date | null {
  if (!v) return null;
  const [y, m, day] = v.split("T")[0].split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

/**
 * Date-only sibling of DateTimePicker: a popover with the dark-themed month
 * calendar. Controlled (`value`+`onChange`) or uncontrolled (`defaultValue`),
 * and renders a hidden input so it submits inside plain forms. Value: YYYY-MM-DD.
 */
export function DatePicker({
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
  const [dateObj, setDateObj] = useState<Date | null>(parse(value ?? defaultValue));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = dateObj ? fmtDate(dateObj) : "";

  useEffect(() => {
    onChange?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

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
    ? dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    : placeholder ?? "Select date";

  return (
    <div className="relative" ref={ref} data-required={required || undefined}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={trigger}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={dateObj ? "" : "text-muted-foreground"}>{display}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-lg border border-border bg-card p-3 shadow-lg">
          <MonthCalendar
            selected={dateObj}
            onSelect={(d) => {
              setDateObj(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
