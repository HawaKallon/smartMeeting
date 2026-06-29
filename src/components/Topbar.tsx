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
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-6 relative">
      {/* Mobile menu button */}
      <button
        id="mobile-menu-button"
        className="hidden items-center justify-center rounded-lg border border-border hover:bg-muted/30 transition-colors sm:hidden mr-4"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Ministry context + search */}
      <div className="flex flex-1 items-center gap-6">
        {ministryName && (
          <div className="hidden items-center gap-2 flex-shrink-0 sm:flex">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{ministryName}</span>
          </div>
        )}
        <div className="flex-1 max-w-xs">
          <SearchBar />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <NotificationBell initialNotifications={notifications} />

        <div className="h-6 w-px bg-border" />

        <Link
          href="/administrative/profile"
          className="flex items-center gap-2.5 rounded-lg hover:bg-muted/30 px-3 py-1.5 transition-colors"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">
              {user.name ?? user.email}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-none">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background flex-shrink-0">
            {initial}
          </div>
        </Link>
      </div>
    </header>
  );
}
