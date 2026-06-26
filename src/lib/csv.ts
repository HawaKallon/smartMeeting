// Minimal RFC-4180 CSV serializer — no dependency. Values are coerced to string,
// then quoted when they contain a comma, quote, or newline (internal quotes doubled).

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === "boolean") s = value ? "true" : "false";
  else s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}
