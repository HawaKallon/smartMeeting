"use client";

import { useActionState, useState, useRef, KeyboardEvent } from "react";
import { createEvent, type ActionState } from "../actions";

const field = "mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

type Invite = { email: string; name?: string };

export function EventForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createEvent,
    undefined,
  );

  const [invites, setInvites] = useState<Invite[]>([]);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addInvite(raw: string) {
    const email = raw.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (invites.find((i) => i.email === email)) return;
    setInvites((prev) => [...prev, { email }]);
    setInputVal("");
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email));
  }

  function onInviteKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addInvite(inputVal);
    } else if (e.key === "Backspace" && inputVal === "" && invites.length > 0) {
      setInvites((prev) => prev.slice(0, -1));
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Pass invites as JSON */}
      <input type="hidden" name="invitees" value={JSON.stringify(invites)} />

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

      {/* ── Invite attendees ── */}
      <div>
        <label className={label}>Invite attendees</label>
        <p className="mt-0.5 text-xs text-gray-400">
          Type an email and press Enter, comma, or space to add. Invite emails are sent on creation.
        </p>
        {/* Chip container */}
        <div
          className="mt-1 flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1.5 focus-within:border-gray-900 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {invites.map((inv) => (
            <span
              key={inv.email}
              className="flex items-center gap-1 rounded-full bg-[#0f2444] px-2.5 py-0.5 text-xs font-medium text-white"
            >
              {inv.email}
              <button
                type="button"
                onClick={() => removeInvite(inv.email)}
                className="ml-0.5 text-blue-200 hover:text-white"
                aria-label={`Remove ${inv.email}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={onInviteKeyDown}
            onBlur={() => addInvite(inputVal)}
            placeholder={invites.length === 0 ? "email@ministry.gov…" : ""}
            className="min-w-[180px] flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#0f2444] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a5c] disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
