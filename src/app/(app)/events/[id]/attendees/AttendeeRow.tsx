"use client";

import { useActionState } from "react";
import { updateAttendeeStatus, type ActionState } from "./actions";

interface Props {
  attendeeId: string;
  eventId: string;
  currentStatus: "INVITED" | "CONFIRMED" | "DECLINED";
  removeAction: (formData: FormData) => Promise<void>;
}

export function AttendeeRow({ attendeeId, eventId, currentStatus, removeAction }: Props) {
  const [, statusAction] = useActionState<ActionState, FormData>(
    updateAttendeeStatus,
    undefined,
  );

  return (
    <>
      <td className="px-4 py-2">
        <form action={statusAction}>
          <input type="hidden" name="attendeeId" value={attendeeId} />
          <input type="hidden" name="eventId" value={eventId} />
          <select
            name="status"
            defaultValue={currentStatus}
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (form) form.requestSubmit();
            }}
            className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none"
          >
            <option value="INVITED">Invited</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DECLINED">Declined</option>
          </select>
        </form>
      </td>
      <td className="px-4 py-2">
        <form action={removeAction}>
          <input type="hidden" name="attendeeId" value={attendeeId} />
          <input type="hidden" name="eventId" value={eventId} />
          <button type="submit" className="text-xs text-red-500 hover:text-red-700">
            Remove
          </button>
        </form>
      </td>
    </>
  );
}
