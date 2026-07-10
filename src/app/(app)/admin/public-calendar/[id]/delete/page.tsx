"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deletePublicEvent } from "../../actions";
import { BackButton } from "@/components/BackButton";

export default function DeletePublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [eventId, setEventId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const p = await params;
      setEventId(p.id);
      // In a real implementation, you would fetch the event details here
      // For now, we'll just show a generic delete confirmation
      setLoading(false);
    })();
  }, [params]);

  const handleDelete = async () => {
    setDeleting(true);
    await deletePublicEvent(eventId);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <BackButton href="/administrative/admin/public-calendar" label="Public Calendar" />

      <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Destructive action</p>
        <h1 className="mt-2 text-2xl font-bold text-red-900">Delete Event?</h1>
        <p className="mt-2 text-sm text-red-800">
          Are you sure you want to delete this event? This action cannot be undone.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-red-200 px-4 py-2 font-medium text-red-900 transition-colors hover:bg-red-100"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
