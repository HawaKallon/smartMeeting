"use client";

import { useActionState } from "react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { createPublicEvent, updatePublicEvent, publishPublicEvent, unpublishPublicEvent, type ActionState } from "./actions";
import type { PublicEvent } from "@/generated/prisma/client";

interface PublicEventFormProps {
  event?: PublicEvent;
  isNew?: boolean;
}

export function PublicEventForm({ event, isNew }: PublicEventFormProps) {
  const saveAction = event ? updatePublicEvent.bind(null, event.id) : createPublicEvent;
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    saveAction,
    undefined,
  );
  const [preview, setPreview] = useState<string | null>(event?.bannerImage || null);

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
    await publishPublicEvent(event!.id);
  };

  const handleUnpublish = async () => {
    await unpublishPublicEvent(event!.id);
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
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Detailed description of the event"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
            Category
          </label>
          <input
            type="text"
            id="category"
            name="category"
            defaultValue={event?.category || ""}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Conference, Workshop, Announcement"
          />
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
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Main Hall, Conference Room A"
          />
        </div>

        {/* Banner Image */}
        <div>
          <label htmlFor="bannerImage" className="block text-sm font-medium text-foreground mb-2">
            Banner Image
          </label>
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
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted-foreground">
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
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/register"
          />
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-200">
            {state.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : isNew ? "Create Event" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Publish/Unpublish buttons */}
      {!isNew && (
        <div className="border-t border-border pt-6">
          <h3 className="font-semibold text-foreground mb-3">Publication</h3>
          {event?.status === "DRAFT" ? (
            <button
              onClick={handlePublish}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
            >
              Publish Event
            </button>
          ) : (
            <button
              onClick={handleUnpublish}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
            >
              Unpublish Event
            </button>
          )}
        </div>
      )}
    </div>
  );
}
