"use client";

import { useActionState, useState } from "react";
import { inviteUser, inviteExternal, type ActionState } from "./actions";

type User = { id: string; name: string | null; email: string };

interface Props {
  eventId: string;
  uninvitedUsers: User[];
}

const field =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";
const label = "block text-sm font-medium text-gray-700";

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
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-medium text-gray-700">Add Attendee</h2>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("user")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "user" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Ministry User
        </button>
        <button
          type="button"
          onClick={() => setTab("external")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "external" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          External Guest
        </button>
      </div>

      {tab === "user" ? (
        <form action={userAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />

          {userState?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{userState.error}</p>
          )}
          {userState?.ok && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Invited.</p>
          )}

          <div>
            <label className={label}>Select staff member</label>
            {uninvitedUsers.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">All ministry users are already invited.</p>
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
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {userPending ? "Inviting…" : "Send Invitation"}
            </button>
          )}
        </form>
      ) : (
        <form action={extAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />

          {extState?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{extState.error}</p>
          )}
          {extState?.ok && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Guest invited.</p>
          )}

          <div>
            <label className={label}>Full name</label>
            <input name="externalName" required className={field} placeholder="e.g. John Mensah" />
          </div>
          <div>
            <label className={label}>Email (optional)</label>
            <input
              name="externalEmail"
              type="email"
              className={field}
              placeholder="for invite notification"
            />
          </div>

          <button
            type="submit"
            disabled={extPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {extPending ? "Inviting…" : "Send Invitation"}
          </button>
        </form>
      )}
    </div>
  );
}
