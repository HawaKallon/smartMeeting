"use client";

import { useActionState, useState } from "react";
import { createLetter, updateLetter, type ActionState } from "./actions";

const field =
  "mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

interface Props {
  eventId: string;
  existing?: {
    id: string;
    title: string;
    body: string;
    colorCategory: "RED" | "AMBER" | "GREEN";
  };
  onCancel?: () => void;
}

export function LetterComposer({ eventId, existing, onCancel }: Props) {
  const isEdit = !!existing;
  const action = isEdit ? updateLetter : createLetter;

  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const [preview, setPreview] = useState(false);
  const [bodyValue, setBodyValue] = useState(existing?.body ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventId" value={eventId} />
      {isEdit && <input type="hidden" name="letterId" value={existing!.id} />}

      {state?.error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
      {state?.ok && !isEdit && (
        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-400">Letter saved.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={label}>Letter title</label>
          <input
            name="title"
            required
            defaultValue={existing?.title}
            className={field}
            placeholder="e.g. Official Meeting Invitation"
          />
        </div>

        <div>
          <label className={label}>Colour category</label>
          <select
            name="colorCategory"
            defaultValue={existing?.colorCategory ?? "GREEN"}
            className={field}
          >
            <option value="GREEN">Green — Routine</option>
            <option value="AMBER">Amber — Internal</option>
            <option value="RED">Red — Urgent / Cabinet</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={label}>Body</label>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>

        {preview ? (
          <div className="mt-1 min-h-[200px] rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-foreground whitespace-pre-wrap">
            {bodyValue || <span className="text-muted-foreground italic">Nothing to preview yet.</span>}
          </div>
        ) : (
          <textarea
            name="body"
            required
            rows={12}
            value={bodyValue}
            onChange={(e) => setBodyValue(e.target.value)}
            className={field}
            placeholder="Dear [Recipient],&#10;&#10;You are cordially invited to attend…"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create letter"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
