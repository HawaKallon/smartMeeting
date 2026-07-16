"use client";

import { useState } from "react";
import { publishEvent, unpublishEvent } from "./edit/actions";
import { AlertCircle, Loader, Upload, XCircle } from "lucide-react";

export function PublishButton({
  eventId,
  isPublic,
  status,
}: {
  eventId: string;
  isPublic: boolean;
  status: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPublic) return null;

  const isPublished = status === "PUBLISHED";

  const handlePublish = async () => {
    setLoading(true);
    setError(null);
    const result = await publishEvent(eventId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  const handleUnpublish = async () => {
    setLoading(true);
    setError(null);
    const result = await unpublishEvent(eventId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {isPublished ? (
        <button
          onClick={handleUnpublish}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Unpublish
        </button>
      ) : (
        <button
          onClick={handlePublish}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Publish
        </button>
      )}
    </>
  );
}
