import type { LucideIcon } from "lucide-react";

// Lightweight, dependency-free charts (pure CSS/SVG) for the analytics page.

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground/60" />}
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export type BarDatum = { label: string; value: number; color?: string };

export function BarList({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data</p>;
  }
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/80">{d.label}</span>
            <span className="font-medium text-muted-foreground">{d.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? "var(--color-sidebar-primary, #6366f1)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MonthlyBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-2" style={{ height: 140 }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted-foreground">{d.count}</span>
          <div
            className="w-full rounded-t bg-sidebar-primary/80"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
          />
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export type DonutSegment = { label: string; value: number; color: string };

export function Donut({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel?: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-muted, #27272a)" strokeWidth="12" />
        {total > 0 &&
          segments.map((s) => {
            const length = (s.value / total) * circumference;
            const dash = (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="12"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return dash;
          })}
      </svg>
      <div className="space-y-1.5">
        {centerLabel && <p className="text-sm font-semibold text-foreground">{centerLabel}</p>}
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-foreground/80">{s.label}</span>
            <span className="text-muted-foreground">
              {s.value}
              {total > 0 ? ` (${Math.round((s.value / total) * 100)}%)` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
