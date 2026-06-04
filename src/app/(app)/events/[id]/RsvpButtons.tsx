"use client";

import { useActionState } from "react";
import { selfRsvp, type ActionState } from "./attendees/actions";

const STATUS_LABEL = {
  INVITED: "Awaiting your response",
  CONFIRMED: "You confirmed attendance",
  DECLINED: "You declined",
};

const STATUS_COLOR = {
  INVITED: "text-yellow-700",
  CONFIRMED: "text-green-700",
  DECLINED: "text-red-700",
};

interface Props {
  eventId: string;
  currentStatus: "INVITED" | "CONFIRMED" | "DECLINED";
}

export function RsvpButtons({ eventId, currentStatus }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    selfRsvp,
    undefined,
  );

  return (
    <div className="space-y-3">
      <p className={`text-sm font-medium ${STATUS_COLOR[currentStatus]}`}>
        {STATUS_LABEL[currentStatus]}
      </p>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="status" value="CONFIRMED" />
          <button
            type="submit"
            disabled={pending || currentStatus === "CONFIRMED"}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-40"
          >
            Confirm Attendance
          </button>
        </form>

        <form action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="status" value="DECLINED" />
          <button
            type="submit"
            disabled={pending || currentStatus === "DECLINED"}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Decline
          </button>
        </form>
      </div>
    </div>
  );
}
