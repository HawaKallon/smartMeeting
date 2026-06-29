"use client";

import { useActionState } from "react";
import { respondToInvitation, type PublicRsvpState } from "./actions";

type Status = "INVITED" | "CONFIRMED" | "DECLINED";

export function RsvpResponseForm({
  token,
  currentStatus,
  suggestedStatus,
}: {
  token: string;
  currentStatus: Status;
  suggestedStatus?: "CONFIRMED" | "DECLINED";
}) {
  const [state, formAction, pending] = useActionState<PublicRsvpState, FormData>(
    respondToInvitation,
    {},
  );
  const displayedStatus = state.status ?? currentStatus;

  return (
    <div className="space-y-5">
      {state.ok ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {state.status === "CONFIRMED"
            ? "Your attendance has been confirmed."
            : "Your decline has been recorded."} You may revise your response below while the invitation remains open.
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.error}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current response</p>
        <p className={`mt-1 text-sm font-semibold ${
          displayedStatus === "CONFIRMED"
            ? "text-emerald-700"
            : displayedStatus === "DECLINED"
              ? "text-red-700"
              : "text-amber-700"
        }`}>
          {displayedStatus === "CONFIRMED"
            ? "Accepted"
            : displayedStatus === "DECLINED"
              ? "Declined"
              : "Awaiting your response"}
        </p>
      </div>

      {suggestedStatus ? (
        <p className="text-sm text-slate-600">
          Please confirm that you wish to {suggestedStatus === "CONFIRMED" ? "accept" : "decline"} this invitation.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={formAction}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="status" value="CONFIRMED" />
          <button
            type="submit"
            disabled={pending || displayedStatus === "CONFIRMED"}
            className={`w-full rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto ${
              suggestedStatus === "CONFIRMED" ? "bg-emerald-800 ring-2 ring-emerald-300" : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {pending ? "Recording…" : "Accept Invitation"}
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="status" value="DECLINED" />
          <button
            type="submit"
            disabled={pending || displayedStatus === "DECLINED"}
            className={`w-full rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto ${
              suggestedStatus === "DECLINED"
                ? "border-red-400 bg-red-50 text-red-800 ring-2 ring-red-200"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {pending ? "Recording…" : "Decline"}
          </button>
        </form>
      </div>
    </div>
  );
}
