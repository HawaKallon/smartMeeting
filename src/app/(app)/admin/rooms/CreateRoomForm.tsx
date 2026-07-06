"use client";

import { useActionState } from "react";
import { createRoom } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function CreateRoomForm({
  isSuperAdmin,
  ministries,
}: {
  isSuperAdmin?: boolean;
  ministries?: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(createRoom, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{state.error}</div>
      )}

      {state?.ok && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Room created successfully!
        </div>
      )}

      {isSuperAdmin && ministries && (
        <div>
          <label className={label}>Ministry *</label>
          <select
            name="ministryId"
            required
            className={field}
          >
            <option value="">Select a ministry</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>Room Name *</label>
        <input
          type="text"
          name="name"
          required
          className={field}
          placeholder="e.g., Conference Room A"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Location *</label>
          <input
            type="text"
            name="location"
            required
            className={field}
            placeholder="e.g., Floor 3"
          />
        </div>
        <div>
          <label className={label}>Capacity *</label>
          <input
            type="number"
            name="capacity"
            required
            min="1"
            className={field}
            placeholder="Maximum people"
          />
        </div>
      </div>

      <div>
        <label className={label}>Amenities (comma-separated)</label>
        <input
          type="text"
          name="amenities"
          className={field}
          placeholder="e.g., Projector, Whiteboard, Video Conference"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Creating..." : "Create Room"}
      </button>
    </form>
  );
}
