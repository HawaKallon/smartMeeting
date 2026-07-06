"use client";

import { ChangeEvent } from "react";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]";

/**
 * Shared date-only input. Uses the same native input pattern and styling as the
 * public-calendar form. Value: YYYY-MM-DD.
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
  const controlled = value !== undefined;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <input
      type="date"
      name={name}
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : defaultValue}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}
