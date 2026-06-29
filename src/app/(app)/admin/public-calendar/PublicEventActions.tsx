"use client";

import { useState, useTransition } from "react";
import { deletePublicEvent, publishPublicEvent, unpublishPublicEvent } from "./actions";

export function PublicEventActions({ id, status }: { id: string; status: "DRAFT" | "PUBLISHED" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && <span className="w-full text-right text-xs text-red-400">{error}</span>}
      <button disabled={pending} onClick={() => run(() => status === "DRAFT" ? publishPublicEvent(id) : unpublishPublicEvent(id))} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
        {status === "DRAFT" ? "Publish" : "Unpublish"}
      </button>
      <button disabled={pending} onClick={() => { if (window.confirm("Delete this public event permanently?")) run(() => deletePublicEvent(id)); }} className="rounded-md border border-red-500/30 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50">Delete</button>
    </div>
  );
}
