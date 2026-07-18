"use client";

import { useActionState } from "react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { updatePublicEvent, type ActionState } from "@/app/(app)/admin/public-calendar/actions";
import { publishEvent, unpublishEvent } from "@/app/(app)/events/[id]/edit/actions";
import { CATEGORY_LIST, CATEGORY_LABELS } from "@/lib/public-event-categories";
import { MinistryMultiSelect } from "@/components/MinistryMultiSelect";
import type { Event } from "@/generated/prisma/client";

interface PublicEventFormProps {
  event: Event & { invitedMinistries?: { id: string; name: string }[] };
  ministries?: { id: string; name: string; code: string }[];
  userMinistryId?: string | null;
}

export function PublicEventForm({ event, ministries = [], userMinistryId }: PublicEventFormProps) {
  const saveAction = updatePublicEvent.bind(null, event.id);
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    saveAction,
    undefined,
  );
  const [preview, setPreview] = useState<string | null>(event?.bannerImage || null);
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>(
    event?.invitedMinistries?.map(m => m.id) ?? []
  );

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePublish = async () => {
    await publishEvent(event!.id);
  };

  const handleUnpublish = async () => {
    await unpublishEvent(event!.id);
  };

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
            Event Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={event?.title || ""}
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
            placeholder="e.g., Ministry Conference 2024"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={event?.description || ""}
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
            placeholder="Detailed description of the event"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={event?.category || ""}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
          >
            <option value="">— Select a category —</option>
            {CATEGORY_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Date/Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startAt" className="block text-sm font-medium text-foreground mb-2">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              id="startAt"
              name="startAt"
              defaultValue={event?.startAt?.toISOString().slice(0, 16) || ""}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
            />
          </div>
          <div>
            <label htmlFor="endAt" className="block text-sm font-medium text-foreground mb-2">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              id="endAt"
              name="endAt"
              defaultValue={event?.endAt?.toISOString().slice(0, 16) || ""}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
            />
          </div>
        </div>

        {/* Venue */}
        <div>
          <label htmlFor="venueName" className="block text-sm font-medium text-foreground mb-2">
            Venue Name
          </label>
          <input
            type="text"
            id="venueName"
            name="venueName"
            defaultValue={event?.venueName || ""}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
            placeholder="e.g., Main Hall, Conference Room A"
          />
        </div>

        {/* Banner Image */}
        <div>
          <label htmlFor="bannerImage" className="block text-sm font-medium text-foreground mb-2">
            Banner Image
          </label>
          <p className="text-xs text-muted-foreground mb-2">Optional - Max 5MB, JPG/PNG recommended</p>
          {preview && (
            <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden">
              <Image src={preview} alt="Preview" fill className="object-cover" />
            </div>
          )}
          <input
            type="file"
            id="bannerImage"
            name="bannerImage"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="sr-only"
          />
          <label
            htmlFor="bannerImage"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 cursor-pointer hover:bg-[#f0f5fc] transition-colors font-medium text-sm"
          >
            <Upload className="h-4 w-4" />
            Choose Image
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            PNG, JPG, or WebP (max 5MB)
          </p>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-foreground mb-2">
              Contact Email
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              defaultValue={event?.contactEmail || ""}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-foreground mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              id="contactPhone"
              name="contactPhone"
              defaultValue={event?.contactPhone || ""}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* External URL */}
        <div>
          <label htmlFor="externalUrl" className="block text-sm font-medium text-foreground mb-2">
            External Link
          </label>
          <input
            type="url"
            id="externalUrl"
            name="externalUrl"
            defaultValue={event?.externalUrl || ""}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
            placeholder="https://example.com/register"
          />
        </div>

        {/* Invite Ministries */}
        <MinistryMultiSelect
          ministries={ministries}
          selected={selectedMinistries}
          onSelectionChange={setSelectedMinistries}
          disabledMinistryId={userMinistryId}
          helperText="Search or select ministries. Leadership at selected ministries will be notified when this event is published."
        />

        {state?.error && (
          <div className="rounded-xl bg-red-100 p-3 text-sm text-red-800">
            {state.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#002a68] disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Publish/Unpublish buttons */}
      <div className="border-t border-border pt-6">
          <h3 className="font-semibold text-foreground mb-3">Publication</h3>
          {event?.status === "DRAFT" ? (
            <button
              onClick={handlePublish}
              className="rounded-xl bg-[#007236] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#00592a]"
            >
              Publish Event
            </button>
          ) : (
            <button
              onClick={handleUnpublish}
              className="rounded-xl bg-[#fab700] px-4 py-2.5 font-medium text-[#1f2f49] transition-colors hover:bg-[#e0a500]"
            >
              Unpublish Event
            </button>
          )}
        </div>
    </div>
  );
}
