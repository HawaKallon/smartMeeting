"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadRecording } from "./actions";

export function Uploader({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await uploadRecording(formData);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input
        type="file"
        name="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
        required
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-gray-800"
      />
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Uploading & transcribing…" : "Upload audio"}
      </button>
    </form>
  );
}
