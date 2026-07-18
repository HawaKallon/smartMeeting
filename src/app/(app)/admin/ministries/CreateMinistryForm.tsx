"use client";

import { useActionState } from "react";
import { createMinistry } from "./actions";

const field = "mt-1 w-full rounded-xl border border-border bg-secondary/55 px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function CreateMinistryForm() {
  const [state, formAction, isPending] = useActionState(createMinistry, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state?.ok && (
        state.emailSent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Ministry created and admin invitation email sent
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Ministry created — but the admin invitation email could not be sent. Check email configuration.
          </div>
        )
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Ministry Name *</label>
          <input
            type="text"
            name="name"
            required
            className={field}
            placeholder="Ministry of Health"
          />
        </div>
        <div>
          <label className={label}>Code *</label>
          <input
            type="text"
            name="code"
            required
            className={field}
            placeholder="MOH"
            maxLength={10}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Short alphanumeric code (e.g., MOH, MOE)
          </p>
        </div>
      </div>

      <div>
        <label className={label}>Email Domain *</label>
        <input
          type="text"
          name="emailDomain"
          required
          className={field}
          placeholder="mocti.gov.sl"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          The gov.sl domain staff log in with. Users with an email ending in this domain are routed to this ministry.
        </p>
      </div>

      <div className="space-y-4 rounded-[1.25rem] border border-border/70 bg-secondary/35 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground/80">Check-in GPS Accuracy</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sets the minimum GPS accuracy (in meters) required for attendees to check in with geofenced meetings.
          </p>
        </div>
        <div>
          <label className={label}>Max GPS Accuracy (meters)</label>
          <input type="number" name="compoundMaxGpsAccuracy" min="1" max="1000" defaultValue="75" className={field} />
        </div>
      </div>

      <div className="space-y-4 rounded-[1.25rem] border border-border/70 bg-secondary/35 p-4">
        <p className="text-sm font-semibold text-foreground/80">First Admin</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Admin Name *</label>
            <input
              type="text"
              name="adminName"
              required
              className={field}
              placeholder="Hawa Kallon"
            />
          </div>
          <div>
            <label className={label}>Admin Email *</label>
            <input
              type="email"
              name="adminEmail"
              required
              className={field}
              placeholder="hawa.kallon@mocti.gov.sl"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Must match the ministry email domain above
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002a68] disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Ministry & Admin"}
      </button>
    </form>
  );
}
