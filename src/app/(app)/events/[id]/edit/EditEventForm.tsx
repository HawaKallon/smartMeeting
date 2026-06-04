"use client";

import { useActionState } from "react";
import { updateEvent } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function EditEventForm({ event }: any) {
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
          <input
            type="datetime-local"
            name="startAt"
            defaultValue={event.startAt?.toISOString().slice(0, 16)}
            required
            className={field}
          />
        </div>
        <div>
          <label className={label}>End Date & Time *</label>
          <input
            type="datetime-local"
            name="endAt"
            defaultValue={event.endAt?.toISOString().slice(0, 16)}
            required
            className={field}
          />
        </div>
      </div>

      <div>
        <label className={label}>Venue Name</label>
        <input
          type="text"
          name="venueName"
          defaultValue={event.venueName || ""}
          className={field}
          placeholder="e.g., Parliament House"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={label}>Latitude</label>
          <input
            type="number"
            name="venueLat"
            defaultValue={event.venueLat || ""}
            step="0.00001"
            className={field}
            placeholder="0.0000"
          />
        </div>
        <div>
          <label className={label}>Longitude</label>
          <input
            type="number"
            name="venueLng"
            defaultValue={event.venueLng || ""}
            step="0.00001"
            className={field}
            placeholder="0.0000"
          />
        </div>
        <div>
          <label className={label}>Geofence Radius (m)</label>
          <input
            type="number"
            name="geofenceRadius"
            defaultValue={event.geofenceRadius || 50}
            min="0"
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Event Type</label>
          <select name="type" defaultValue={event.type} className={field}>
            <option value="MEETING">Meeting</option>
            <option value="CONFERENCE">Conference</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="TRAINING">Training</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className={label}>Classification</label>
          <select name="classification" defaultValue={event.classification} className={field}>
            <option value="PUBLIC">Public</option>
            <option value="INTERNAL">Internal</option>
            <option value="CONFIDENTIAL">Confidential</option>
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
