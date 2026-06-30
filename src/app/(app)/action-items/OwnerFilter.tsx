"use client";

import { useTransition } from "react";

type User = { id: string; name: string | null; email: string };

export function OwnerFilter({ users, currentFilter }: { users: User[]; currentFilter: string }) {
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    startTransition(() => {
      const url = new URL(window.location.href);
      if (value === "all") {
        url.searchParams.delete("owner");
      } else {
        url.searchParams.set("owner", value);
      }
      window.history.replaceState(null, "", url);
      window.location.reload();
    });
  }

  return (
    <select
      defaultValue={currentFilter ?? "all"}
      onChange={handleChange}
      className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
    >
      <option value="all">All assignees</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name ?? u.email}
        </option>
      ))}
    </select>
  );
}
