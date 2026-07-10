"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ROLE_LABELS, MINISTRY_ROLES } from "@/lib/roles";
import type { MinistryRole } from "@/generated/prisma/enums";

const ASSIGNABLE_ROLES = ["MINISTER", "PERMANENT_SECRETARY", "DEPUTY_MINISTER", "DEPUTY_SECRETARY", "ADMIN_STAFF", "ADMIN", "STAFF_MEMBER"] as const;

const control =
  "rounded-xl border border-border bg-secondary/55 px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";

export function UserFilters({
  ministries,
}: {
  ministries?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/administrative/admin/users?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[1.35rem] border border-border bg-card p-4 shadow-[0_16px_40px_rgba(15,35,63,0.07)]">
      <form
        action={(fd) => setParam("q", String(fd.get("q") ?? ""))}
        className="relative flex-1 min-w-[200px]"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search name or email…"
          className={`${control} w-full pl-9`}
        />
      </form>

      <select
        value={params.get("role") ?? ""}
        onChange={(e) => setParam("role", e.target.value)}
        className={control}
      >
        <option value="">All roles</option>
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      {ministries && (
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
      )}
    </div>
  );
}
