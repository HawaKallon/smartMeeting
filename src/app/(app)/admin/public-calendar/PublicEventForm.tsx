"use client";

import { useActionState } from "react";
import type { PublicEventFormState } from "@/lib/publicEvents";

type FormEvent = {
  title: string;
  description: string | null;
  category: string | null;
  startAt: Date;
  endAt: Date;
  venueName: string | null;
  bannerImage: string | null;
  externalUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ministryId: string;
};

function dateTimeValue(value: Date) {
  return value.toISOString().slice(0, 16);
}

export function PublicEventForm({
  action,
  event,
  ministries,
}: {
  action: (state: PublicEventFormState, formData: FormData) => Promise<PublicEventFormState>;
  event?: FormEvent;
  ministries?: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const inputClass = "mt-1.5 w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-blue-500";

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {state.error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{state.error}</div>}

      {ministries && (
        <label className="block text-sm font-medium text-foreground">Ministry
          <select name="ministryId" required defaultValue={event?.ministryId ?? ""} className={inputClass}>
            <option value="" disabled>Select a ministry</option>
            {ministries.map((ministry) => <option key={ministry.id} value={ministry.id}>{ministry.name}</option>)}
          </select>
        </label>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-foreground sm:col-span-2">Title
          <input name="title" required minLength={2} maxLength={160} defaultValue={event?.title} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">Category
          <input name="category" maxLength={50} defaultValue={event?.category ?? ""} placeholder="Conference, Public Notice…" className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">Venue
          <input name="venueName" maxLength={200} defaultValue={event?.venueName ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">Starts
          <input type="datetime-local" name="startAt" required defaultValue={event ? dateTimeValue(event.startAt) : ""} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">Ends
          <input type="datetime-local" name="endAt" required defaultValue={event ? dateTimeValue(event.endAt) : ""} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground sm:col-span-2">Description
          <textarea name="description" maxLength={5000} rows={7} defaultValue={event?.description ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">External link
          <input type="url" name="externalUrl" maxLength={2048} defaultValue={event?.externalUrl ?? ""} placeholder="https://…" className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">Contact email
          <input type="email" name="contactEmail" maxLength={254} defaultValue={event?.contactEmail ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">Contact phone
          <input type="tel" name="contactPhone" maxLength={30} defaultValue={event?.contactPhone ?? ""} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-foreground">Banner image
          <input type="file" name="banner" accept="image/png,image/jpeg,image/webp" className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-foreground file:px-3 file:py-1 file:text-background`} />
          <span className="mt-1 block text-xs text-muted-foreground">PNG, JPEG, or WebP, maximum 5 MB.{event?.bannerImage ? " Leave empty to keep the current banner." : ""}</span>
        </label>
      </div>

      <div className="flex justify-end">
        <button disabled={pending} className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{pending ? "Saving…" : event ? "Save changes" : "Create draft"}</button>
      </div>
    </form>
  );
}
