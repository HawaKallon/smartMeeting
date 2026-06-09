"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const label = "block text-sm font-medium text-foreground/80";

export function EditProfileForm({ initialName }: { initialName: string }) {
  const [state, formAction, isPending] = useActionState(updateProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{state.error}</div>
      )}

      {state?.ok && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          Profile updated successfully!
        </div>
      )}

      <div>
        <label className={label}>Full Name</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={initialName}
          className={field}
          placeholder="Your full name"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Updating..." : "Save Changes"}
      </button>
    </form>
  );
}
