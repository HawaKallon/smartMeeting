"use client";

import { useActionState } from "react";
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
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish & Distribute"}
      </button>
    </form>
  );
}
