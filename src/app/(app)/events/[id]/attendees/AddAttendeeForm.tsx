"use client";

import { useActionState, useState } from "react";
import { inviteUser, inviteExternal, type ActionState } from "./actions";
import { Users, Mail } from "lucide-react";

type User = { id: string; name: string | null; email: string };

interface Props {
  eventId: string;
  uninvitedUsers: User[];
}

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function AddAttendeeForm({ eventId, uninvitedUsers }: Props) {
  const [tab, setTab] = useState<"user" | "external">("user");

  const [userState, userAction, userPending] = useActionState<ActionState, FormData>(
    inviteUser,
    undefined,
  );
  const [extState, extAction, extPending] = useActionState<ActionState, FormData>(
    inviteExternal,
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
          Ministry User
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
        <form action={userAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />

          {userState?.error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {userState.error}
            </div>
          )}
          {userState?.ok && (
            <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
              ✅ User invited
            </div>
          )}

          <div>
            <label className={label}>Select staff member</label>
            {uninvitedUsers.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">All ministry users are already invited.</p>
            ) : (
              <select name="userId" required className={field} defaultValue="">
                <option value="" disabled>
                  Choose a user…
                </option>
                {uninvitedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email} ({u.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {uninvitedUsers.length > 0 && (
            <button
              type="submit"
              disabled={userPending}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {userPending ? "Inviting…" : "Send Invitation"}
            </button>
          )}
        </form>
      ) : (
        <form action={extAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />

          {extState?.error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {extState.error}
            </div>
          )}
          {extState?.ok && (
            <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
              ✅ Guest invited
            </div>
          )}

          <div>
            <label className={label}>Full name *</label>
            <input
              name="externalName"
              required
              className={field}
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div>
            <label className={label}>Email (optional)</label>
            <input
              name="externalEmail"
              type="email"
              className={field}
              placeholder="jane@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={extPending}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {extPending ? "Inviting…" : "Send Invitation"}
          </button>
        </form>
      )}
    </div>
  );
}
