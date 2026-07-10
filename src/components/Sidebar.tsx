"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { ROLE_LABELS, canManageEvents, isSuperAdmin } from "@/lib/roles";
import type { MinistryRole } from "@/generated/prisma/enums";
import { NavLink, SidebarNavProvider } from "./SidebarNav";
import { useSidebarState } from "./SidebarState";
import {
  LayoutDashboard,
  CalendarDays,
  KanbanSquare,
  PlusCircle,
  ClipboardList,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  Bell,
  HelpCircle,
  Settings,
  BarChart3,
  User,
  Users,
  Activity,
} from "lucide-react";

export function Sidebar({
  user,
}: {
  user: { name?: string | null; email: string; role: MinistryRole };
}) {
  const isStaff = canManageEvents(user.role);
  const isSuperAdminUser = isSuperAdmin(user.role);
  const isAdmin = user.role === "ADMIN" || isSuperAdminUser;
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();
  const { collapsed, toggleCollapsed } = useSidebarState();

  // Build the list of all hrefs shown for this user (deduped)
  const navHrefs = Array.from(
    new Set([
      "/administrative",
      "/administrative/calendar",
      "/administrative/action-items",
      "/administrative/notifications",
      ...(isStaff
        ? [
            "/administrative/events/new",
            "/administrative/events",
            "/administrative/attendance",
            "/administrative/reports",
          ]
        : []),
      "/administrative/profile",
      ...(isSuperAdminUser
        ? [
            "/administrative/events/new",
            "/administrative/events",
            "/administrative/attendance",
            "/administrative/admin",
            "/administrative/admin/ministries",
            "/administrative/admin/users",
            "/administrative/admin/rooms",
            "/administrative/admin/activity",
            "/administrative/reports",
          ]
        : []),
      ...(isAdmin ? ["/administrative/admin/public-calendar"] : []),
      ...(user.role === "ADMIN"
        ? [
            "/administrative/admin/users",
            "/administrative/admin/rooms",
            "/administrative/admin/activity",
          ]
        : []),
      "/administrative/help",
      "/administrative/settings",
    ]),
  );

  return (
    <aside className="relative hidden h-screen w-full flex-shrink-0 flex-col overflow-visible border-r border-sidebar-border bg-[linear-gradient(180deg,#f7fbff_0%,#f1f7fe_100%)] sm:flex">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={collapsed}
        className="absolute right-[-1px] top-24 z-30 hidden h-16 w-10 translate-x-[48%] items-center justify-center rounded-r-[999px] rounded-l-none border border-l-0 border-[#cfdced] bg-[linear-gradient(180deg,#fafdff_0%,#eef4fc_100%)] shadow-[10px_14px_30px_rgba(0,53,128,0.10)] transition-all duration-300 hover:bg-[linear-gradient(180deg,#ffffff_0%,#f2f7ff_100%)] sm:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#003580] shadow-[0_8px_18px_rgba(0,53,128,0.16)] ring-1 ring-[#d7e3f1] transition-transform duration-300">
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </span>
      </button>

      <div
        className={`border-b border-sidebar-border py-5 transition-[padding] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "px-4" : "px-5"}`}
      >
        <div className="flex items-start justify-between gap-3 overflow-hidden">
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            <div className="flex h-12 w-12 items-center justify-center">
              <Image
                src="/coat_of_arms.jpeg"
                alt="Sierra Leone coat of arms"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </div>
            <div
              className={`min-w-0 overflow-hidden pl-3.5 transition-[max-width,opacity,transform,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                collapsed
                  ? "max-w-0 translate-x-2 opacity-0 pl-0"
                  : "max-w-[13rem] translate-x-0 opacity-100"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <span className="block text-[19px] font-semibold leading-none tracking-[-0.02em] text-sidebar-foreground">
                  SmartMeeting
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#007236]/80">
                  Government of Sierra Leone
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SidebarNavProvider hrefs={navHrefs}>
        <nav
          className={`flex-1 space-y-6 overflow-y-auto py-5 transition-[padding] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "px-3" : "px-4"}`}
        >
          <NavSection label="Main" collapsed={collapsed}>
            <NavLink
              href="/administrative"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              collapsed={collapsed}
            />
            <NavLink
              href="/administrative/calendar"
              icon={<CalendarDays className="h-4 w-4" />}
              label="Calendar"
              collapsed={collapsed}
            />
            <NavLink
              href="/administrative/action-items"
              icon={<KanbanSquare className="h-4 w-4" />}
              label="Action Items"
              collapsed={collapsed}
            />
            <NavLink
              href="/administrative/notifications"
              icon={<Bell className="h-4 w-4" />}
              label="Notifications"
              collapsed={collapsed}
            />
          </NavSection>

          {isStaff && (
            <NavSection label="Management" collapsed={collapsed}>
              <NavLink
                href="/administrative/events/new"
                icon={<PlusCircle className="h-4 w-4" />}
                label="Schedule Activity"
                collapsed={collapsed}
              />
              <NavLink
                href="/administrative/events"
                icon={<CalendarDays className="h-4 w-4" />}
                label="All Events"
                collapsed={collapsed}
              />
              <NavLink
                href="/administrative/attendance"
                icon={<ClipboardList className="h-4 w-4" />}
                label="Attendance"
                collapsed={collapsed}
              />
              <NavLink
                href="/administrative/reports"
                icon={<BarChart3 className="h-4 w-4" />}
                label="Reports"
                collapsed={collapsed}
              />
            </NavSection>
          )}

          <NavSection label="System" collapsed={collapsed}>
            <NavLink
              href="/administrative/profile"
              icon={<User className="h-4 w-4" />}
              label="Profile"
              collapsed={collapsed}
            />
            {isSuperAdminUser && (
              <>
                <NavLink
                  href="/administrative/admin"
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Platform Overview"
                  collapsed={collapsed}
                />
                <NavLink
                  href="/administrative/admin/ministries"
                  icon={<Building2 className="h-4 w-4" />}
                  label="Manage Ministries"
                  collapsed={collapsed}
                />
                <NavLink
                  href="/administrative/admin/users"
                  icon={<Users className="h-4 w-4" />}
                  label="Manage Users"
                  collapsed={collapsed}
                />
                <NavLink
                  href="/administrative/admin/rooms"
                  icon={<Building2 className="h-4 w-4" />}
                  label="Manage Rooms"
                  collapsed={collapsed}
                />
                <NavLink
                  href="/administrative/admin/activity"
                  icon={<Activity className="h-4 w-4" />}
                  label="Activity Log"
                  collapsed={collapsed}
                />
                <NavLink
                  href="/administrative/reports"
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Reports"
                  collapsed={collapsed}
                />
              </>
            )}
            {isAdmin && (
              <NavLink
                href="/administrative/admin/public-calendar"
                icon={<CalendarDays className="h-4 w-4" />}
                label="Public Calendar"
                collapsed={collapsed}
              />
            )}
            {user.role === "ADMIN" && (
              <>
                <NavLink
                  href="/administrative/admin/users"
                  icon={<Users className="h-4 w-4" />}
                  label="Manage Users"
                  collapsed={collapsed}
                />
                <NavLink
                  href="/administrative/admin/rooms"
                  icon={<Building2 className="h-4 w-4" />}
                  label="Manage Rooms"
                  collapsed={collapsed}
                />
                <NavLink
                  href="/administrative/admin/activity"
                  icon={<Activity className="h-4 w-4" />}
                  label="Activity Log"
                  collapsed={collapsed}
                />
              </>
            )}
            <NavLink
              href="/administrative/help"
              icon={<HelpCircle className="h-4 w-4" />}
              label="Help & Centre"
              collapsed={collapsed}
            />
            <NavLink
              href="/administrative/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              collapsed={collapsed}
            />
          </NavSection>
        </nav>
      </SidebarNavProvider>

      <div
        className={`border-t border-sidebar-border bg-[#edf4fd] transition-[padding] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "p-3" : "p-4"}`}
      >
        <div
          className={`rounded-2xl border border-border bg-card shadow-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "flex flex-col items-center gap-3 px-2 py-3" : "flex items-center gap-3 px-3 py-3"}`}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-white">
            {initial}
          </div>
          <div
            className={`min-w-0 overflow-hidden transition-[max-width,opacity,transform,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              collapsed
                ? "max-w-0 translate-x-2 opacity-0"
                : "max-w-[11rem] flex-1 translate-x-0 opacity-100"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name ?? user.email}
              </p>
              <p className="text-xs text-sidebar-foreground/55">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => signOut({ callbackUrl: "/administrative/login" })}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-secondary/60 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavSection({
  label,
  children,
  collapsed,
}: {
  label: string;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  return (
    <div>
      <p
        className={`overflow-hidden px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 transition-[max-height,opacity,margin] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed ? "mb-0 max-h-0 opacity-0" : "mb-1 max-h-6 opacity-100"
        }`}
      >
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
