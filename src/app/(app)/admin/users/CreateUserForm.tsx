"use client";

import { useActionState } from "react";
import { createUser } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          User created and invitation email sent
        </div>
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
            placeholder="john@ministry.gov"
          />
        </div>
      </div>

      <div>
        <label className={label}>Role *</label>
        <select name="role" required className={field}>
          <option value="">Select a role</option>
          <option value="ADMIN_STAFF">Admin Staff</option>
          <option value="PERMANENT_SECRETARY">Permanent Secretary</option>
          <option value="DEPUTY_SECRETARY">Deputy Secretary</option>
          <option value="DEPUTY_MINISTER">Deputy Minister</option>
          <option value="MINISTER">Minister</option>
          <option value="ADMIN">Super Admin</option>
        </select>
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
