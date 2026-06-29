"use client";

import { useRouter, useSearchParams } from "next/navigation";

const control =
  "rounded-xl border border-border bg-secondary/55 px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";

export function RoomFilters({
  ministries,
}: {
  ministries: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/administrative/admin/rooms?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[1.35rem] border border-border bg-card p-4 shadow-[0_16px_40px_rgba(15,35,63,0.07)]">
      <select
        value={params.get("ministryId") ?? ""}
        onChange={(e) => setParam("ministryId", e.target.value)}
        className={control}
      >
        <option value="">All ministries</option>
        {ministries.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
