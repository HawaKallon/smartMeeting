"use client";

import { ChangeEvent } from "react";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]";

/**
 * Shared date-time input. Uses the same native datetime-local control and
 * styling as the public-calendar form. Value: YYYY-MM-DDTHH:mm.
 */
export function DateTimePicker({
  name,
  value,
  defaultValue,
  onChange,
  required,
  placeholder,
  className,
  min,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  min?: string;
}) {
  const controlled = value !== undefined;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <input
      type="datetime-local"
      name={name}
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : defaultValue}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
      min={min}
      className={className ?? inputClass}
    />
  );
}
