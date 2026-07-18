"use client";

import { useActionState } from "react";
import { manualCheckIn, type ActionState } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function WalkInCheckInForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    manualCheckIn,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          ✓ Guest checked in
        </div>
      )}

      <div>
        <label className={label}>Full Name *</label>
        <input
          name="externalName"
          placeholder="e.g. Jane Doe"
          className={field}
          required
          minLength={1}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {pending ? "Checking in…" : "Check In"}
      </button>
    </form>
  );
}
