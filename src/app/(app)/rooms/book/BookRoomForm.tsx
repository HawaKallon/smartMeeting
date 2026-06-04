"use client";

import { useActionState } from "react";
import { bookRoom } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
}

export function BookRoomForm({ rooms, userId }: { rooms: Room[]; userId: string }) {
  const [state, formAction, isPending] = useActionState(bookRoom, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="userId" value={userId} />

      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{state.error}</div>
      )}

      {state?.ok && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Room booked successfully!
        </div>
      )}

      <div>
        <label className={label}>Room *</label>
        <select name="roomId" required className={field}>
          <option value="">Select a room</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} (capacity: {room.capacity}, {room.location})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Date *</label>
          <input type="date" name="date" required className={field} />
        </div>
        <div>
          <label className={label}>Purpose *</label>
          <select name="purpose" required className={field}>
            <option value="">Select purpose</option>
            <option value="MEETING">Meeting</option>
            <option value="TRAINING">Training</option>
            <option value="CONFERENCE">Conference</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Start Time *</label>
          <input type="time" name="startTime" required className={field} />
        </div>
        <div>
          <label className={label}>End Time *</label>
          <input type="time" name="endTime" required className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Number of Attendees</label>
        <input
          type="number"
          name="attendeeCount"
          min="1"
          className={field}
          placeholder="Expected number of people"
        />
      </div>

      <div>
        <label className={label}>Additional Notes</label>
        <textarea
          name="notes"
          rows={3}
          className={field}
          placeholder="Any special requirements or notes..."
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Booking..." : "Book Room"}
      </button>
    </form>
  );
}
