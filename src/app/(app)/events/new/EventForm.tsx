"use client";

import { useActionState } from "react";
import { createEvent, type ActionState } from "../actions";

const field = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";
const label = "block text-sm font-medium text-gray-700";

export function EventForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createEvent,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div>
        <label className={label}>Title</label>
        <input name="title" required className={field} />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={3} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Type</label>
          <select name="type" defaultValue="MEETING" className={field}>
            <option value="MEETING">Meeting</option>
            <option value="CONFERENCE">Conference</option>
            <option value="APPOINTMENT">Appointment</option>
          </select>
        </div>
        <div>
          <label className={label}>Classification</label>
          <select name="classification" defaultValue="PUBLIC" className={field}>
            <option value="PUBLIC">Public / Internal</option>
            <option value="RESTRICTED">Restricted / Secret</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Start</label>
          <input name="startAt" type="datetime-local" required className={field} />
        </div>
        <div>
          <label className={label}>End</label>
          <input name="endAt" type="datetime-local" required className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Venue name</label>
        <input name="venueName" className={field} placeholder="e.g. Cabinet Room A" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={label}>Venue latitude</label>
          <input name="venueLat" type="number" step="any" className={field} />
        </div>
        <div>
          <label className={label}>Venue longitude</label>
          <input name="venueLng" type="number" step="any" className={field} />
        </div>
        <div>
          <label className={label}>Geofence radius (m)</label>
          <input name="geofenceRadius" type="number" defaultValue={100} className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Letter color category</label>
        <select name="colorCategory" defaultValue="" className={field}>
          <option value="">None</option>
          <option value="RED">Red — urgent / cabinet</option>
          <option value="AMBER">Amber — internal</option>
          <option value="GREEN">Green — routine</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
