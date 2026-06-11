"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
      />
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
      >
        <Upload size={16} />
        {pending ? "Uploading & transcribing…" : "Upload audio"}
      </button>
    </form>
  );
}
