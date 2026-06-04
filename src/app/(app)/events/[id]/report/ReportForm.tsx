"use client";

import { useActionState } from "react";
import { saveReport } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";

export function ReportForm({ eventId }: { eventId: string }) {
  const [state, formAction, isPending] = useActionState(saveReport, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Report saved successfully
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground/80">Report Content</label>
        <textarea
          name="content"
          placeholder="Document key outcomes, decisions, action items, and any important notes from the meeting..."
          rows={12}
          required
          className={field}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Include summary, decisions made, participants, and recommendations
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Saving..." : "Save Report"}
      </button>
    </form>
  );
}
