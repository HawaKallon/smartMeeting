"use client";

import { useActionState } from "react";
import { updateEvent } from "./actions";
import { DateTimePicker } from "@/components/DateTimePicker";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

type Room = { id: string; name: string; location: string; capacity: number };

export function EditEventForm({ event, rooms }: { event: any; rooms: Room[] }) {
  const [state, formAction, isPending] = useActionState(updateEvent, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventId" value={event.id} />

      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Event updated successfully
        </div>
      )}

      <div>
        <label className={label}>Event Title *</label>
        <input
          type="text"
          name="title"
          defaultValue={event.title}
          required
          className={field}
          placeholder="Event title"
        />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea
          name="description"
          defaultValue={event.description || ""}
          rows={4}
          className={field}
          placeholder="Event description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Start Date & Time *</label>
          <DateTimePicker name="startAt" defaultValue={event.startAt?.toISOString().slice(0, 16)} required />
        </div>
        <div>
          <label className={label}>End Date & Time *</label>
          <DateTimePicker name="endAt" defaultValue={event.endAt?.toISOString().slice(0, 16)} required />
        </div>
      </div>

      {/* Room Selection */}
      <div>
        <label className={label}>Room (optional)</label>
        <select
          name="roomId"
          defaultValue={event.roomId || ""}
          className={field}
        >
          <option value="">No room assigned</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} ({room.capacity} people) - {room.location}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Event Type</label>
          <select name="type" defaultValue={event.type} className={field}>
            <option value="MEETING">Meeting</option>
            <option value="CONFERENCE">Conference</option>
            <option value="APPOINTMENT">Appointment</option>
          </select>
        </div>
        <div>
          <label className={label}>Classification</label>
          <select name="classification" defaultValue={event.classification} className={field}>
            <option value="PUBLIC">Public</option>
            <option value="RESTRICTED">Restricted</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Updating..." : "Update Event"}
      </button>
    </form>
  );
}
