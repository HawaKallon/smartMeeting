"use client";

import { useActionState, useState } from "react";
import { createUser } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

type Ministry = { id: string; name: string; emailDomain: string | null };

export function CreateUserForm({
  isSuperAdmin = false,
  ministries = [],
}: {
  isSuperAdmin?: boolean;
  ministries?: Ministry[];
}) {
  const [state, formAction, isPending] = useActionState(createUser, undefined);
  const [ministryId, setMinistryId] = useState("");
  const selectedDomain = ministries.find((m) => m.id === ministryId)?.emailDomain ?? null;

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.ok && (
        state.emailSent ? (
          <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
            User created and invitation email sent
          </div>
        ) : (
          <div className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
            User created — but the invitation email could not be sent. Check email configuration.
          </div>
        )
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Full Name *</label>
          <input
            type="text"
            name="name"
            required
            className={field}
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className={label}>Email *</label>
          <input
            type="email"
            name="email"
            required
            className={field}
            placeholder="john@ministry.gov.sl"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedDomain
              ? `Must end in @${selectedDomain}`
              : "Must be a government email ending in .gov.sl"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isSuperAdmin && (
          <div>
            <label className={label}>Ministry *</label>
            <select
              name="ministryId"
              required
              value={ministryId}
              onChange={(e) => setMinistryId(e.target.value)}
              className={field}
            >
              <option value="">Select a ministry</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.emailDomain ? ` (@${m.emailDomain})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={label}>Role *</label>
          <select name="role" required className={field}>
            <option value="">Select a role</option>
            <option value="ADMIN_STAFF">Admin Staff</option>
            <option value="PERMANENT_SECRETARY">Permanent Secretary</option>
            <option value="DEPUTY_SECRETARY">Deputy Secretary</option>
            <option value="DEPUTY_MINISTER">Deputy Minister</option>
            <option value="MINISTER">Minister</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Creating..." : "Create User & Send Invite"}
      </button>
    </form>
  );
}
