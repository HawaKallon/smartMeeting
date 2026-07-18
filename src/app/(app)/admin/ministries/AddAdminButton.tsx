"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { addMinistryAdmin } from "./actions";
import { useActionMessage } from "@/hooks/useActionMessage";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";

export function AddAdminButton({
  ministryId,
  emailDomain,
}: {
  ministryId: string;
  emailDomain: string | null;
}) {
  const [open, setOpen] = useState(false);
  const action = addMinistryAdmin.bind(null, ministryId);
  const [state, formAction, isPending] = useActionState(action, undefined);
  const messageVisible = useActionMessage(state);

  if (!emailDomain) {
    return <span className="text-xs text-muted-foreground">No domain set</span>;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
      >
        <UserPlus className="h-3 w-3" />
        Add admin
      </button>

      {open && (
        <form action={formAction} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          {messageVisible && state?.error && <p className="text-xs text-red-400">{state.error}</p>}
          {messageVisible && state?.ok && !state?.error && (
            <p className="text-xs text-green-400">
              Admin added{state.emailSent ? " and invite sent" : " — invite email not sent"}
            </p>
          )}
          <input type="text" name="adminName" required className={field} placeholder="Admin name" />
          <input
            type="email"
            name="adminEmail"
            required
            className={field}
            placeholder={`name@${emailDomain}`}
          />
          <p className="text-[11px] text-muted-foreground">Must end in @{emailDomain}</p>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add admin"}
          </button>
        </form>
      )}
    </div>
  );
}
