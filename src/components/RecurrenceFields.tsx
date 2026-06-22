"use client";

import { useState } from "react";
import { DatePicker } from "@/components/DatePicker";

const field =
  "mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

/**
 * The "Repeat" controls, shared by the create and edit forms. Manages its own
 * state and renders the named inputs the server actions read
 * (recurrenceFreq / recurrenceInterval / recurrenceEndType / recurrenceCount /
 * recurrenceUntil). Pass `default*` props to prefill when editing a series.
 */
export function RecurrenceFields({
  defaultFreq = "NONE",
  defaultInterval = "1",
  defaultEndType = "COUNT",
  defaultCount = "5",
  defaultUntil = "",
}: {
  defaultFreq?: string;
  defaultInterval?: string;
  defaultEndType?: string;
  defaultCount?: string;
  defaultUntil?: string;
}) {
  const [freq, setFreq] = useState(defaultFreq);
  const [interval, setInterval] = useState(defaultInterval);
  const [endType, setEndType] = useState(defaultEndType);
  const [count, setCount] = useState(defaultCount);
  const [until, setUntil] = useState(defaultUntil);

  const repeats = freq !== "NONE";
  const unitLabel =
    freq === "DAILY" ? "day(s)" : freq === "WEEKLY" ? "week(s)" : freq === "MONTHLY" ? "month(s)" : "";

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Repeat</label>
          <select name="recurrenceFreq" value={freq} onChange={(e) => setFreq(e.target.value)} className={field}>
            <option value="NONE">Does not repeat</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="WEEKDAYS">Every weekday (Mon–Fri)</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        {repeats && freq !== "WEEKDAYS" && (
          <div>
            <label className={label}>Every</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                name="recurrenceInterval"
                min="1"
                max="52"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className={field}
              />
              <span className="text-sm text-muted-foreground">{unitLabel}</span>
            </div>
          </div>
        )}
      </div>

      {repeats && (
        <div className="mt-4">
          <label className={label}>Ends</label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrenceEndType"
                value="COUNT"
                checked={endType === "COUNT"}
                onChange={() => setEndType("COUNT")}
                id="end-count"
              />
              <label htmlFor="end-count" className="text-sm text-foreground">After</label>
              <input
                type="number"
                name="recurrenceCount"
                min="1"
                max="200"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={endType !== "COUNT"}
                className="w-20 rounded-md border border-border bg-muted/50 px-2 py-1 text-sm text-foreground disabled:opacity-50 focus:border-ring focus:outline-none"
              />
              <span className="text-sm text-muted-foreground">occurrence(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrenceEndType"
                value="UNTIL"
                checked={endType === "UNTIL"}
                onChange={() => setEndType("UNTIL")}
                id="end-until"
              />
              <label htmlFor="end-until" className="text-sm text-foreground">On date</label>
              {endType === "UNTIL" && (
                <div className="w-56">
                  <DatePicker name="recurrenceUntil" value={until} onChange={setUntil} placeholder="End date" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
