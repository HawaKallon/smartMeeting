import { signOut } from "@/auth";
import { ROLE_LABELS, canManageEvents, isSuperAdmin } from "@/lib/roles";
import type { MinistryRole } from "@/generated/prisma/enums";
import { NavLink, SidebarNavProvider } from "./SidebarNav";
import {
  LayoutDashboard, CalendarDays, KanbanSquare,
  PlusCircle, ClipboardList, LogOut, Building2,
  Bell, HelpCircle, Settings, BarChart3, User, Users, Activity, Lock, DoorOpen,
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

  // Build the list of all hrefs shown for this user (deduped)
  const navHrefs = Array.from(new Set([
    "/",
    "/calendar",
    "/kanban",
    "/notifications",
    ...(isStaff ? ["/events/new", "/events", "/attendance", "/reports"] : []),
    "/profile",
    ...(isSuperAdminUser ? ["/admin", "/admin/ministries", "/admin/users", "/admin/rooms", "/admin/activity", "/reports"] : []),
    ...(isAdmin ? ["/admin/public-calendar"] : []),
    ...(user.role === "ADMIN" ? ["/admin/users", "/admin/rooms", "/admin/activity"] : []),
    "/help",
    "/settings",
  ]));

  return (
    <aside className="hidden sm:flex h-screen w-64 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">SmartMeeting</span>
      </div>

      {/* Navigation */}
      <SidebarNavProvider hrefs={navHrefs}>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <NavSection label="Main">
          <NavLink href="/">
            <LayoutDashboard className="h-4 w-4 text-white" />
            Dashboard
          </NavLink>
          <NavLink href="/calendar">
            <CalendarDays className="h-4 w-4 text-white" />
            Calendar
          </NavLink>

          <NavLink href="/kanban">
            <KanbanSquare className="h-4 w-4 text-white" />
            Action Items
          </NavLink>
          <NavLink href="/notifications">
            <Bell className="h-4 w-4 text-white" />
            Notifications
          </NavLink>
        </NavSection>

        {isStaff && (
          <NavSection label="Management">
            <NavLink href="/events/new">
              <PlusCircle className="h-4 w-4 text-white" />
              New Event
            </NavLink>
            <NavLink href="/events">
              <CalendarDays className="h-4 w-4 text-white" />
              All Events
            </NavLink>
            <NavLink href="/attendance">
              <ClipboardList className="h-4 w-4 text-white" />
              Attendance
            </NavLink>
            <NavLink href="/reports">
              <BarChart3 className="h-4 w-4 text-white" />
              Reports
            </NavLink>
          </NavSection>
        )}

        <NavSection label="System">
          <NavLink href="/profile">
            <User className="h-4 w-4 text-white" />
            Profile
          </NavLink>
          {isSuperAdminUser && (
            <>
              <NavLink href="/admin">
                <BarChart3 className="h-4 w-4 text-white" />
                Platform Overview
              </NavLink>
              <NavLink href="/admin/ministries">
                <Building2 className="h-4 w-4 text-white" />
                Manage Ministries
              </NavLink>
              <NavLink href="/admin/users">
                <Users className="h-4 w-4 text-white" />
                Manage Users
              </NavLink>
              <NavLink href="/admin/rooms">
                <Building2 className="h-4 w-4 text-white" />
                Manage Rooms
              </NavLink>
              <NavLink href="/admin/activity">
                <Activity className="h-4 w-4 text-white" />
                Activity Log
              </NavLink>
              <NavLink href="/reports">
                <BarChart3 className="h-4 w-4 text-white" />
                Reports
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink href="/admin/public-calendar">
              <CalendarDays className="h-4 w-4 text-white" />
              Public Calendar
            </NavLink>
          )}
          {user.role === "ADMIN" && (
            <>
              <NavLink href="/admin/users">
                <Users className="h-4 w-4 text-white" />
                Manage Users
              </NavLink>
              <NavLink href="/admin/rooms">
                <Building2 className="h-4 w-4 text-white" />
                Manage Rooms
              </NavLink>
              <NavLink href="/admin/activity">
                <Activity className="h-4 w-4 text-white" />
                Activity Log
              </NavLink>
            </>
          )}
          <NavLink href="/help">
            <HelpCircle className="h-4 w-4 text-white" />
            Help &amp; Centre
          </NavLink>
          <NavLink href="/settings">
            <Settings className="h-4 w-4 text-white" />
            Settings
          </NavLink>
        </NavSection>
        </nav>
      </SidebarNavProvider>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name ?? user.email}
            </p>
            <p className="text-xs text-sidebar-foreground/50">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
