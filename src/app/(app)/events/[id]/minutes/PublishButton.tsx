"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { publishMinutes, type ActionState } from "./actions";

interface Props {
  minutesId: string;
  eventId: string;
}

export function PublishButton({ minutesId, eventId }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    publishMinutes,
    undefined,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="minutesId" value={minutesId} />
      <input type="hidden" name="eventId" value={eventId} />
      {state?.error ? (
        <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 rounded-md bg-sidebar-primary px-4 py-2 text-sm font-medium text-white hover:bg-sidebar-primary/90 disabled:opacity-50 transition-colors"
      >
        <Send size={16} />
        {pending ? "Publishing…" : "Publish & Distribute"}
      </button>
    </form>
  );
}
