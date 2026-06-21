"use client";

import { useState } from "react";
import { LetterComposer } from "./LetterComposer";
import { COLOR_META } from "@/lib/colors";

interface LetterData {
  id: string;
  title: string;
  body: string;
  colorCategory: "RED" | "AMBER" | "GREEN";
  createdAt: string;
}

interface Props {
  letter: LetterData;
  eventId: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function LetterPanel({ letter, eventId, deleteAction }: Props) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground/80">Edit letter</h2>
        <LetterComposer
          eventId={eventId}
          existing={letter}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_META[letter.colorCategory].badge}`}>
            {COLOR_META[letter.colorCategory].label}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{letter.title}</p>
            <p className="text-xs text-muted-foreground">{letter.createdAt}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/letters/${letter.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted/50"
          >
            Download PDF
          </a>
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-muted/50"
          >
            Edit
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="letterId" value={letter.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Hide body ▲" : "Show body ▼"}
        </button>
        {expanded && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">{letter.body}</p>
        )}
      </div>
    </div>
  );
}
