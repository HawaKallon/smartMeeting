"use client";

import { useActionState, useState } from "react";
import { manualCheckIn, type ActionState } from "./actions";
import { Users, Mail } from "lucide-react";

type Invitee = {
  attendeeId: string;
  name: string | null;
  email: string | null;
  external: boolean;
};

interface Props {
  eventId: string;
  invitedUsers: Invitee[];
}

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function ManualCheckInForm({ eventId, invitedUsers }: Props) {
  const [tab, setTab] = useState<"user" | "external">("user");
  const [state, action, pending] = useActionState<ActionState, FormData>(
    manualCheckIn,
    undefined,
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("user")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "user"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Invited User
        </button>
        <button
          type="button"
          onClick={() => setTab("external")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "external"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          External Guest
        </button>
      </div>

      {tab === "user" ? (
        <form action={action} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />

          {state?.error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {state.error}
            </div>
          )}
          {state?.already ? (
            <div className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
              Already checked in
            </div>
          ) : state?.ok ? (
            <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
              ✓ User checked in
            </div>
          ) : null}

          <div>
            <label className={label}>Select invited user</label>
            {invitedUsers.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">All invited users have already checked in.</p>
            ) : (
              <select name="attendeeId" required className={field} defaultValue="">
                <option value="" disabled>
                  Choose a user…
                </option>
                {invitedUsers.map((u) => (
                  <option key={u.attendeeId} value={u.attendeeId}>
                    {u.name ?? u.email}
                    {u.email ? ` (${u.email})` : ""}
                    {u.external ? " — guest" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {invitedUsers.length > 0 && (
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {pending ? "Checking in…" : "Check In"}
            </button>
          )}
        </form>
      ) : (
        <form action={action} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />

          {state?.error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {state.error}
            </div>
          )}
          {state?.already ? (
            <div className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
              Already checked in
            </div>
          ) : state?.ok ? (
            <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
              ✓ Guest checked in
            </div>
          ) : null}

          <div>
            <label className={label}>Full name</label>
            <input
              name="externalName"
              placeholder="e.g. Jane Doe"
              className={field}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {pending ? "Checking in…" : "Check In"}
          </button>
        </form>
      )}
    </div>
  );
}
