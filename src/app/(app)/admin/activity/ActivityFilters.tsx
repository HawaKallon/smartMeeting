"use client";

const control =
  "rounded-xl border border-border bg-secondary/55 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary cursor-pointer";

export function ActivityFilters({
  action,
  ministryId,
  actions,
  ministries,
  superAdmin,
}: {
  action?: string;
  ministryId?: string;
  actions: string[];
  ministries?: { id: string; name: string }[];
  superAdmin: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[1.35rem] border border-border bg-card p-4 shadow-[0_16px_40px_rgba(15,35,63,0.07)]">
      <label className="text-sm font-medium text-foreground">Filter by action:</label>
      <select
        onChange={(e) => {
          const url = new URL(window.location.href);
          if (e.target.value) {
            url.searchParams.set("action", e.target.value);
            url.searchParams.delete("page");
          } else {
            url.searchParams.delete("action");
          }
          window.location.href = url.toString();
        }}
        defaultValue={action ?? ""}
        className={control}
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      {superAdmin && ministries && (
        <>
          <label className="text-sm font-medium text-foreground">Filter by ministry:</label>
          <select
            onChange={(e) => {
              const url = new URL(window.location.href);
              if (e.target.value) {
                url.searchParams.set("ministryId", e.target.value);
                url.searchParams.delete("page");
              } else {
                url.searchParams.delete("ministryId");
              }
              window.location.href = url.toString();
            }}
            defaultValue={ministryId ?? ""}
            className={control}
          >
            <option value="">All ministries</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
