import Link from "next/link";

export function CalendarViewToggle({
  view,
  year,
  month,
  day,
}: {
  view: "internal" | "public";
  year?: number;
  month?: number;
  day?: string;
}) {
  const toggleButtonClass =
    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5";
  const activeButtonClass = `${toggleButtonClass} bg-secondary text-foreground`;
  const inactiveButtonClass = `${toggleButtonClass} text-muted-foreground hover:bg-secondary/50`;

  const baseParams = new URLSearchParams();
  if (year !== undefined) baseParams.set("y", String(year));
  if (month !== undefined) baseParams.set("m", String(month));
  if (day !== undefined) baseParams.set("d", day);

  const internalParams = new URLSearchParams(baseParams);
  internalParams.set("view", "internal");
  const internalHref = `/administrative/calendar${day ? "/day" : ""}?${internalParams}`;

  const publicParams = new URLSearchParams(baseParams);
  publicParams.set("view", "public");
  const publicHref = `/administrative/calendar${day ? "/day" : ""}?${publicParams}`;

  return (
    <div className="rounded-lg border border-border bg-card p-0.5 flex gap-0">
      <Link
        href={internalHref}
        className={view === "internal" ? activeButtonClass : inactiveButtonClass}
      >
        Internal
      </Link>
      <Link
        href={publicHref}
        className={view === "public" ? activeButtonClass : inactiveButtonClass}
      >
        Public
      </Link>
    </div>
  );
}
