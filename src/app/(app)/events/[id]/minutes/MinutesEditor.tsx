"use client";

import { useActionState, useState } from "react";
import {
  saveMinutesDraft,
  generateMinutesSummary,
  type ActionState,
  type GenerateSummaryState,
} from "./actions";

const field =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";
const label = "block text-sm font-medium text-gray-700";

interface Props {
  eventId: string;
  body: string;
  summary: string | null;
  published: boolean;
}

export function MinutesEditor({ eventId, body, summary, published }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveMinutesDraft,
    undefined,
  );
  const [genState, generateAction, generating] = useActionState<
    GenerateSummaryState,
    FormData
  >(generateMinutesSummary, undefined);

  // Summary is controlled so the AI-generated text can populate it in place.
  // When a generate run returns, sync its text in during render (the React-
  // recommended way to adjust state from a changed value without an effect).
  const [summaryText, setSummaryText] = useState(summary ?? "");
  const [lastGen, setLastGen] = useState(genState);
  if (genState !== lastGen) {
    setLastGen(genState);
    if (genState && "ok" in genState) setSummaryText(genState.summary);
  }

  if (published) {
    return (
      <div className="space-y-4">
        <div>
          <p className={label}>Body</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{body || "—"}</p>
        </div>
        {summary ? (
          <div>
            <p className={label}>Summary</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{summary}</p>
          </div>
        ) : null}
        <p className="text-xs text-gray-400 italic">Published — locked for editing.</p>
      </div>
    );
  }

  return (
    <>
      {/* Standalone form so the generate button (rendered inside the save form
          via the `form` attribute) submits independently. */}
      <form id="generate-summary" action={generateAction}>
        <input type="hidden" name="eventId" value={eventId} />
      </form>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="eventId" value={eventId} />

      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : state?.ok ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Draft saved.</p>
      ) : null}

      <div>
        <label className={label}>Body</label>
        <textarea
          name="body"
          rows={16}
          defaultValue={body}
          className={field}
          placeholder="Enter meeting minutes…"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={label}>Summary (optional)</label>
          <button
            type="submit"
            form="generate-summary"
            disabled={generating}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate from transcript"}
          </button>
        </div>
        {genState && "error" in genState ? (
          <p className="mt-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {genState.error}
          </p>
        ) : null}
        <textarea
          name="summary"
          rows={3}
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
          className={field}
          placeholder="Brief summary of key decisions, or generate one from the transcript…"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save draft"}
      </button>
      </form>
    </>
  );
}
