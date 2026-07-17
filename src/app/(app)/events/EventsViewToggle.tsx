import Link from "next/link";

export function EventsViewToggle({ view }: { view: "internal" | "public" }) {
  const toggleButtonClass =
    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5";
  const activeButtonClass = `${toggleButtonClass} bg-secondary text-foreground`;
  const inactiveButtonClass = `${toggleButtonClass} text-muted-foreground hover:bg-secondary/50`;

  return (
    <div className="rounded-lg border border-border bg-card p-0.5 flex gap-0">
      <Link
        href="/administrative/events?view=internal"
        className={view === "internal" ? activeButtonClass : inactiveButtonClass}
      >
        Internal
      </Link>
      <Link
        href="/administrative/events?view=public"
        className={view === "public" ? activeButtonClass : inactiveButtonClass}
      >
        Public
      </Link>
    </div>
  );
}
