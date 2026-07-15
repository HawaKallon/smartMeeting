"use client";

import { useActionState, useState, KeyboardEvent } from "react";
import { createEvent, type ActionState } from "../actions";
import { RoomSchedulePreview } from "./RoomSchedulePreview";
import { RecurrenceFields } from "@/components/RecurrenceFields";
import { X } from "lucide-react";

const field = "mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const publicCalendarField = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]";
const label = "block text-sm font-medium text-foreground/80";
const publicCalendarLabel = "block text-sm font-medium text-foreground mb-2";

type Invite = { email: string; name: string };
type Room = { id: string; name: string; location: string; capacity: number; ministryId: string };
type Ministry = {
  id: string;
  name: string;
  code: string;
  compoundLat: number | null;
  compoundLng: number | null;
  compoundGeofenceRadius: number;
  compoundMaxGpsAccuracy: number;
};

export function EventForm({
  rooms,
  ministries,
  isSuperAdmin = false,
  initialDate,
}: {
  rooms: Room[];
  ministries?: Ministry[];
  isSuperAdmin?: boolean;
  initialDate?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createEvent,
    undefined,
  );

  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  // Combined datetime strings (YYYY-MM-DDTHH:mm). Seed from a calendar-day
  // prefill at 09:00-10:00; the native inputs drive changes.
  const [startAt, setStartAt] = useState(initialDate ? `${initialDate}T09:00` : "");
  const [endAt, setEndAt] = useState(initialDate ? `${initialDate}T10:00` : "");
  const ministryOptions = ministries ?? [];
  const isSuperAdminCreate = isSuperAdmin;
  const availableRooms = isSuperAdminCreate
    ? rooms.filter((room) => room.ministryId === selectedMinistryId)
    : rooms;
  const selectedMinistry = isSuperAdminCreate
    ? ministryOptions.find((ministry) => ministry.id === selectedMinistryId)
    : ministryOptions[0];
  const selectedRoom = availableRooms.find((room) => room.id === selectedRoomId);
  const selectedMinistryHasCompound =
    selectedMinistry?.compoundLat != null && selectedMinistry?.compoundLng != null;

  function addInvite() {
    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();

    setInviteError("");

    if (!email || !name) {
      setInviteError("Both name and email are required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Invalid email address");
      return;
    }

    if (invites.find((i) => i.email === email)) {
      setInviteError("This email is already invited");
      return;
    }

    setInvites((prev) => [...prev, { email, name }]);
    setInviteName("");
    setInviteEmail("");
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email));
  }

  function handleInviteKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addInvite();
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Pass invites as JSON */}
      <input type="hidden" name="invitees" value={JSON.stringify(invites)} />
      {isSuperAdminCreate && <input type="hidden" name="ministryId" value={selectedMinistryId} />}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label className={label}>Title</label>
        <input name="title" required className={field} />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={3} className={field} />
      </div>

      {isSuperAdminCreate && (
        <div>
          <label className={label}>Ministry</label>
          <select
            value={selectedMinistryId}
            onChange={(e) => {
              setSelectedMinistryId(e.target.value);
              setSelectedRoomId("");
            }}
            required
            className={field}
          >
            <option value="">Select a ministry</option>
            {ministryOptions.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name} ({ministry.code})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Activity Type</label>
          <select name="type" defaultValue="MEETING" className={field}>
            <option value="MEETING">Meeting</option>
            <option value="CONFERENCE">Conference</option>
            <option value="APPOINTMENT">Appointment</option>
          </select>
        </div>
        <div>
          <label className={label}>Event Scope</label>
          <select name="scope" defaultValue="TEAM" className={field}>
            <option value="TEAM">Team / Informal</option>
            <option value="OFFICIAL">Official / Formal</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Classification</label>
          <select name="classification" defaultValue="PUBLIC" className={field}>
            <option value="PUBLIC">Public / Internal</option>
            <option value="RESTRICTED">Restricted / Secret</option>
          </select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mt-6">
            Meeting minutes are published directly by the organizer for all meeting types.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startAt" className={publicCalendarLabel}>
            Start Date &amp; Time *
          </label>
          <input
            type="datetime-local"
            id="startAt"
            name="startAt"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
            className={publicCalendarField}
          />
        </div>
        <div>
          <label htmlFor="endAt" className={publicCalendarLabel}>
            End Date &amp; Time *
          </label>
          <input
            type="datetime-local"
            id="endAt"
            name="endAt"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
            className={publicCalendarField}
          />
        </div>
      </div>

      {/* Recurrence */}
      <RecurrenceFields />

      {/* Hidden geofence fields */}
      <input type="hidden" name="geofenceRadius" value="100" />

      {/* Room Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Room (optional)</label>
          <select
            name="roomId"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            disabled={isSuperAdminCreate && !selectedMinistryId}
            className={field}
          >
            <option value="">
              {isSuperAdminCreate && !selectedMinistryId ? "Select a ministry first" : "Select a room"}
            </option>
            {availableRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.capacity} people) - {room.location}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedRoom && selectedMinistry && !selectedMinistryHasCompound && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {selectedMinistry.name} has no compound coordinates yet. This room-based meeting can be created, but QR check-in will not enforce on-site location until the ministry compound is configured.
        </p>
      )}

      {/* Room Schedule Preview */}
      {selectedRoomId && startAt && endAt && (
        <RoomSchedulePreview
          roomId={selectedRoomId}
          startAt={startAt}
          endAt={endAt}
          rooms={availableRooms}
        />
      )}

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
        <p className="mt-0.5 text-xs text-muted-foreground">
          Enter name and email to add attendees. Invitation emails will be sent on creation.
        </p>

        {/* Attendee list */}
        {invites.length > 0 && (
          <div className="mt-3 space-y-2 rounded-lg bg-muted/30 p-3 border border-border/50">
            {invites.map((inv) => (
              <div
                key={inv.email}
                className="flex items-center justify-between rounded-lg bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{inv.name}</p>
                  <p className="text-xs text-muted-foreground">{inv.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeInvite(inv.email)}
                  className="ml-2 flex-shrink-0 text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              {invites.length} attendee{invites.length !== 1 ? "s" : ""} added
            </p>
          </div>
        )}

        {/* Add attendee form */}
        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
          {inviteError && (
            <div className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400 mb-2">
              {inviteError}
            </div>
          )}

          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              onKeyDown={handleInviteKeyDown}
              placeholder="Full name"
              className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none w-1/4 flex-shrink-0"
            />

            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={handleInviteKeyDown}
              placeholder="Email address"
              className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={addInvite}
              className="mt-1 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors whitespace-nowrap flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
      >
        {pending ? "Scheduling…" : "Schedule activity"}
      </button>
    </form>
  );
}
