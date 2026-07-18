"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { updateMinistry } from "./actions";

const field = "mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";

export function EditMinistryButton({
  ministryId,
  name,
  emailDomain,
  compoundMaxGpsAccuracy,
}: {
  ministryId: string;
  name: string;
  emailDomain: string | null;
  compoundMaxGpsAccuracy: number;
}) {
  const [open, setOpen] = useState(false);
  const action = updateMinistry.bind(null, ministryId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>

      {open && (
        <form action={formAction} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
          {state?.ok && <p className="text-xs text-green-400">Ministry updated</p>}
          <input type="text" name="name" required defaultValue={name} className={field} placeholder="Ministry name" />
          <input
            type="text"
            name="emailDomain"
            required
            defaultValue={emailDomain ?? ""}
            className={field}
            placeholder="mocti.gov.sl"
          />
          <p className="text-[11px] text-muted-foreground">
            Changing the domain means users must use the new domain to log in.
          </p>
          <input
            type="number"
            name="compoundMaxGpsAccuracy"
            min="1"
            max="1000"
            defaultValue={compoundMaxGpsAccuracy}
            className={field}
            placeholder="Max GPS accuracy (meters)"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
