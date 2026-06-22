"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { addCoOrganizer, removeCoOrganizer } from "./edit/actions";

type Person = { id: string; name: string | null; email: string };

export function ManageCoOrganizers({
  eventId,
  coOrganizers,
  candidates,
}: {
  eventId: string;
  coOrganizers: Person[];
  candidates: Person[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result?.error) {
      alert("Error: " + result.error);
      return;
    }
    setSelected("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {coOrganizers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {coOrganizers.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
            >
              {c.name ?? c.email}
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removeCoOrganizer(eventId, c.id))}
                className="text-muted-foreground hover:text-red-400 disabled:opacity-50"
                title="Remove co-organizer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={pending || candidates.length === 0}
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none disabled:opacity-50"
        >
          <option value="">
            {candidates.length === 0 ? "No other ministry users" : "Add a co-organizer…"}
          </option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email} ({u.email})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !selected}
          onClick={() => run(() => addCoOrganizer(eventId, selected))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {pending ? "Saving…" : "Add"}
        </button>
      </div>
    </div>
  );
}
