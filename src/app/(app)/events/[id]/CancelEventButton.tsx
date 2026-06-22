"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteEvent } from "./edit/actions";

type Scope = "THIS" | "FUTURE" | "ALL";

export function CancelEventButton({ eventId, isSeries }: { eventId: string; isSeries: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("THIS");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setPending(true);
    setError("");
    const res = await deleteEvent(eventId, scope);
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.push("/calendar");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Cancel
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground">Cancel meeting?</h2>
            {error && (
              <p className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}
            {isSeries ? (
              <div className="mt-3 flex flex-col gap-2 text-sm text-foreground">
                <p className="text-muted-foreground">This is a recurring meeting. Cancel:</p>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={scope === "THIS"} onChange={() => setScope("THIS")} /> This event only
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={scope === "FUTURE"} onChange={() => setScope("FUTURE")} /> This and following events
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={scope === "ALL"} onChange={() => setScope("ALL")} /> All events in the series
                </label>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                This permanently removes the meeting and its attendance, minutes, and recordings.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500/90 disabled:opacity-50"
              >
                {pending ? "Canceling…" : "Cancel meeting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
