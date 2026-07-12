"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  saveMinutesDraft,
  generateMinutesSummary,
  type ActionState,
  type GenerateSummaryState,
} from "./actions";

const field =
  "mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1";
const label = "block text-sm font-medium text-foreground";

interface Props {
  eventId: string;
  body: string;
  summary: string | null;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED";
  editWindowClosed?: boolean;
}

export function MinutesEditor({ eventId, body, summary, status }: Props) {
  const locked = status !== "DRAFT" || editWindowClosed;
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

  if (locked) {
    return (
      <div className="space-y-6">
        <div>
          <p className={`${label} mb-2`}>Meeting Notes</p>
          <div className="rounded-lg bg-secondary/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {body || "—"}
            </p>
          </div>
        </div>
        {summary ? (
          <div>
            <p className={`${label} mb-2`}>Summary</p>
            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {summary}
              </p>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-3">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <p className="text-xs text-blue-400">
            {status === "PUBLISHED" ? "Published — locked for editing." : "Submitted — pending approval."}
          </p>
        </div>
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

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="eventId" value={eventId} />

        {state?.error ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        ) : state?.ok ? (
          <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-400">
            ✓ Draft saved.
          </div>
        ) : null}

        <div>
          <label className={label}>Meeting Notes</label>
          <textarea
            name="body"
            rows={12}
            defaultValue={body}
            className={field}
            placeholder="Enter meeting minutes…"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={label}>Summary (optional)</label>
            <button
              type="submit"
              form="generate-summary"
              disabled={generating}
              className="flex items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              <Sparkles size={14} />
              {generating ? "Generating…" : "Generate summary"}
            </button>
          </div>
          {genState && "error" in genState ? (
            <div className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {genState.error}
            </div>
          ) : null}
          <textarea
            name="summary"
            rows={5}
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            className={field}
            placeholder="Brief summary of key decisions, or generate one from your notes…"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
      </form>
    </>
  );
}
