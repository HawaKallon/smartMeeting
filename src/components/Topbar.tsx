import Link from "next/link";
import type { SystemRole } from "@/generated/prisma/enums";
import { Building2, Menu } from "lucide-react";
import type { MinistryRole, Notification } from "@/generated/prisma/client";
import { NotificationBell } from "./NotificationBell";
import { SearchBar } from "./SearchBar";
import { SierraLeoneFlag } from "./SierraLeoneFlag";

export function Topbar({
  user,
  ministryName,
  notifications = [],
}: {
  user: { id: string; name?: string | null; email: string; role: SystemRole };
  ministryName?: string | null;
  notifications?: Notification[];
}) {
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <header className="relative flex h-20 flex-shrink-0 items-center justify-between border-b border-border bg-[#f8fbff] px-6">
      <button
        id="mobile-menu-button"
        className="mr-4 hidden items-center justify-center rounded-xl border border-border bg-card p-2 transition-colors hover:bg-muted sm:hidden"
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
              <span className="text-sm font-semibold text-foreground">
                {ministryName}
              </span>
            </div>
          </div>
        )}
        <div className="max-w-sm flex-1">
          <SearchBar />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell initialNotifications={notifications} />

        <SierraLeoneFlag className="hidden h-8 w-14 sm:inline-flex" />

        <Link
          href="/administrative/profile"
          className="flex items-center rounded-full border border-border bg-card p-1 transition-colors hover:bg-muted"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {initial}
          </div>
        </Link>
      </div>
    </header>
  );
}
