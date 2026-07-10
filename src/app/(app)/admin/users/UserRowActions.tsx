"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Trash2, Power } from "lucide-react";
import { ROLE_LABELS, MINISTRY_ROLES } from "@/lib/roles";
import type { SystemRole,  MinistryRole } from "@/generated/prisma/enums";
import {
  updateUserRole,
  setUserActive,
  resetUserPassword,
  resendInvite,
  deleteUser,
} from "./actions";

// Roles a super-admin / admin may assign — never SUPER_ADMIN.
const ASSIGNABLE_ROLES = ["MINISTER", "PERMANENT_SECRETARY", "DEPUTY_MINISTER", "DEPUTY_SECRETARY", "ADMIN_STAFF", "ADMIN", "STAFF_MEMBER"] as const;

const iconBtn =
  "rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50";

export function UserRowActions({
  userId,
  userName,
  role,
  active,
}: {
  userId: string;
  userName: string;
  role: SystemRole;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result?.error) {
      alert("Error: " + result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={role}
        disabled={pending}
        onChange={(e) => run(() => updateUserRole(userId, e.target.value))}
        className="rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs text-foreground focus:border-ring focus:outline-none disabled:opacity-50"
        title="Change role"
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setUserActive(userId, !active))}
        className={`${iconBtn} ${active ? "hover:text-amber-400" : "hover:text-green-400"}`}
        title={active ? `Deactivate ${userName}` : `Reactivate ${userName}`}
      >
        <Power className="h-4 w-4" />
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Reset password for ${userName}? A new temporary password will be emailed.`))
            run(() => resetUserPassword(userId));
        }}
        className={`${iconBtn} hover:text-foreground`}
        title="Reset password"
      >
        <KeyRound className="h-4 w-4" />
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => resendInvite(userId))}
        className={`${iconBtn} hover:text-foreground`}
        title="Resend invite"
      >
        <Mail className="h-4 w-4" />
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete ${userName}? This cannot be undone.`))
            run(() => deleteUser(userId));
        }}
        className={`${iconBtn} hover:text-red-400`}
        title="Delete user"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
