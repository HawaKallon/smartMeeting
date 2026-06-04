"use client";

import { useState } from "react";
import { LetterComposer } from "./LetterComposer";

const BADGE: Record<string, string> = {
  RED:   "bg-red-100 text-red-800",
  AMBER: "bg-amber-100 text-amber-800",
  GREEN: "bg-green-100 text-green-800",
};
const LABEL: Record<string, string> = {
  RED: "Urgent / Cabinet", AMBER: "Internal", GREEN: "Routine",
};

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
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Edit letter</h2>
        <LetterComposer
          eventId={eventId}
          existing={letter}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[letter.colorCategory]}`}>
            {LABEL[letter.colorCategory]}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{letter.title}</p>
            <p className="text-xs text-gray-400">{letter.createdAt}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/letters/${letter.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Download PDF
          </a>
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="letterId" value={letter.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="border-t px-5 py-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          {expanded ? "Hide body ▲" : "Show body ▼"}
        </button>
        {expanded && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{letter.body}</p>
        )}
      </div>
    </div>
  );
}
