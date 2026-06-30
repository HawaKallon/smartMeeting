"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MinistryRole, Notification } from "@/generated/prisma/client";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SidebarStateProvider, useSidebarState } from "./SidebarState";

type AppShellClientProps = {
  user: { id: string; name?: string | null; email: string; role: MinistryRole };
  ministryName?: string | null;
  notifications?: Notification[];
  compactMode?: boolean;
  children: React.ReactNode;
};

export function AppShellClient(props: AppShellClientProps) {
  return (
    <SidebarStateProvider>
      <AppShellFrame {...props} />
    </SidebarStateProvider>
  );
}

function AppShellFrame({
  user,
  ministryName,
  notifications = [],
  compactMode = false,
  children,
}: AppShellClientProps) {
  const { collapsed } = useSidebarState();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={`hidden shrink-0 transition-[width] duration-500 ease-in-out sm:block ${collapsed ? "w-[6.5rem]" : "w-72"}`}>
        <Sidebar user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} ministryName={ministryName} notifications={notifications} />
        <main className={`flex-1 overflow-y-auto ${compactMode ? "p-3 sm:p-4" : "p-3 sm:p-6"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
