"use client";

import { useActionState, useState } from "react";
import { updateEvent } from "./actions";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RecurrenceFields } from "@/components/RecurrenceFields";
import { describeRecurrence } from "@/lib/recurrence";
import { useActionMessage } from "@/hooks/useActionMessage";
import type {
  Classification,
  EventType,
  EventScope,
  RecurrenceEndType,
  RecurrenceFrequency,
} from "@/generated/prisma/enums";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

type Room = { id: string; name: string; location: string; capacity: number };
type EditableEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  roomId: string | null;
  type: EventType;
  scope: EventScope;
  classification: Classification;
  seriesId: string | null;
  series: {
    frequency: RecurrenceFrequency;
    interval: number;
    endType: RecurrenceEndType;
    count: number | null;
    until: Date | null;
  } | null;
};

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function EditEventForm({ event, rooms }: { event: EditableEvent; rooms: Room[] }) {
  const [state, formAction, isPending] = useActionState(updateEvent, undefined);
  const [changePattern, setChangePattern] = useState(false);
  const messageVisible = useActionMessage(state);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventId" value={event.id} />

      {messageVisible && state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {messageVisible && state?.ok && !state?.error && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Event updated successfully
        </div>
      )}

      {event.seriesId && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground/80">
              Recurring meeting{event.series ? ` · ${describeRecurrence(event.series)}` : ""}
            </p>
            <button
              type="button"
              onClick={() => setChangePattern((v) => !v)}
              className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              {changePattern ? "Keep current pattern" : "Change repeat pattern"}
            </button>
          </div>

          {!changePattern ? (
            <>
              <p className="mt-3 text-sm text-foreground/80">Apply changes to:</p>
              <div className="mt-2 flex flex-col gap-1.5 text-sm text-foreground">
                <label className="flex items-center gap-2">
                  <input type="radio" name="editScope" value="THIS" defaultChecked /> This event only
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="editScope" value="FUTURE" /> This and following events
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="editScope" value="ALL" /> All events in the series
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                For “following” or “all”, the date stays per-occurrence — only the time and details change.
              </p>
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <input type="hidden" name="editPattern" value="true" />
              <RecurrenceFields
                defaultFreq={event.series?.frequency ?? "WEEKLY"}
                defaultInterval={String(event.series?.interval ?? 1)}
                defaultEndType={event.series?.endType ?? "COUNT"}
                defaultCount={String(event.series?.count ?? 5)}
                defaultUntil={toDateInput(event.series?.until)}
              />
              <div className="flex flex-col gap-1.5 text-sm text-foreground">
                <label className="flex items-center gap-2">
                  <input type="radio" name="patternScope" value="FUTURE" defaultChecked /> This and following events
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="patternScope" value="ALL" /> Entire series
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Regenerates the selected occurrences with the new pattern (starting from this meeting’s date &amp; time). Past meetings are unchanged.
              </p>
            </div>
          )}
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
          <label className={label}>Event Scope</label>
          <select name="eventScope" defaultValue={event.scope} className={field}>
            <option value="TEAM">Team / Informal</option>
            <option value="OFFICIAL">Official / Formal</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Classification</label>
          <select name="classification" defaultValue={event.classification} className={field}>
            <option value="PUBLIC">Public</option>
            <option value="RESTRICTED">Restricted</option>
          </select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mt-6">
            Meeting minutes are published directly by the organizer for all meeting types.
          </p>
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
