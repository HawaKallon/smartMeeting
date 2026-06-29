import Link from "next/link";
import { Building2, Menu } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import type { MinistryRole, Notification } from "@/generated/prisma/client";
import { NotificationBell } from "./NotificationBell";
import { SearchBar } from "./SearchBar";

export function Topbar({
  user,
  ministryName,
  notifications = [],
}: {
  user: { id: string; name?: string | null; email: string; role: MinistryRole };
  ministryName?: string | null;
  notifications?: Notification[];
}) {
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <header className="relative flex h-20 flex-shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <button
        id="mobile-menu-button"
        className="mr-4 hidden items-center justify-center rounded-xl border border-border bg-white p-2 transition-colors hover:bg-muted sm:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center gap-6">
        {ministryName && (
          <div className="hidden flex-shrink-0 items-center gap-3 sm:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#007236]">
                Ministry Workspace
              </p>
              <span className="text-sm font-semibold text-foreground">{ministryName}</span>
            </div>
          </div>
        )}
        <div className="max-w-sm flex-1">
          <SearchBar />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell initialNotifications={notifications} />

        <div className="hidden items-center gap-0 overflow-hidden rounded-md border border-border shadow-sm sm:flex" aria-label="Sierra Leone flag">
          <span className="h-7 w-8 bg-[#007236]" />
          <span className="h-7 w-8 bg-white" />
          <span className="h-7 w-8 bg-[#003580]" />
        </div>

        <Link
          href="/administrative/profile"
          className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 transition-colors hover:bg-muted"
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none text-foreground">
              {user.name ?? user.email}
            </p>
            <p className="mt-0.5 text-xs leading-none text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {initial}
          </div>
        </Link>
      </div>
    </header>
  );
}
