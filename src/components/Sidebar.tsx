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
    "/administrative",
    "/administrative/calendar",
    "/administrative/kanban",
    "/administrative/notifications",
    ...(isStaff ? ["/administrative/events/new", "/administrative/events", "/administrative/attendance", "/administrative/reports"] : []),
    "/administrative/profile",
    ...(isSuperAdminUser ? ["/administrative/admin", "/administrative/admin/ministries", "/administrative/admin/users", "/administrative/admin/rooms", "/administrative/admin/activity", "/administrative/reports"] : []),
    ...(isAdmin ? ["/administrative/admin/public-calendar"] : []),
    ...(user.role === "ADMIN" ? ["/administrative/admin/users", "/administrative/admin/rooms", "/administrative/admin/activity"] : []),
    "/administrative/help",
    "/administrative/settings",
  ]));

  return (
    <aside className="hidden h-screen w-72 flex-shrink-0 flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,#f7fbff_0%,#f1f7fe_100%)] sm:flex">
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sidebar-primary shadow-[0_10px_24px_rgba(0,114,54,0.18)]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[#007236]">
              Government of Sierra Leone
            </span>
            <span className="mt-1 block text-base font-semibold text-sidebar-foreground">SmartMeeting</span>
          </div>
        </div>
      </div>

      <SidebarNavProvider hrefs={navHrefs}>
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <NavSection label="Main">
          <NavLink href="/administrative">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink href="/administrative/calendar">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </NavLink>

          <NavLink href="/administrative/kanban">
            <KanbanSquare className="h-4 w-4" />
            Action Items
          </NavLink>
          <NavLink href="/administrative/notifications">
            <Bell className="h-4 w-4" />
            Notifications
          </NavLink>
        </NavSection>

        {isStaff && (
          <NavSection label="Management">
            <NavLink href="/administrative/events/new">
              <PlusCircle className="h-4 w-4" />
              New Event
            </NavLink>
            <NavLink href="/administrative/events">
              <CalendarDays className="h-4 w-4" />
              All Events
            </NavLink>
            <NavLink href="/administrative/attendance">
              <ClipboardList className="h-4 w-4" />
              Attendance
            </NavLink>
            <NavLink href="/administrative/reports">
              <BarChart3 className="h-4 w-4" />
              Reports
            </NavLink>
          </NavSection>
        )}

        <NavSection label="System">
          <NavLink href="/administrative/profile">
            <User className="h-4 w-4" />
            Profile
          </NavLink>
          {isSuperAdminUser && (
            <>
              <NavLink href="/administrative/admin">
                <BarChart3 className="h-4 w-4" />
                Platform Overview
              </NavLink>
              <NavLink href="/administrative/admin/ministries">
                <Building2 className="h-4 w-4" />
                Manage Ministries
              </NavLink>
              <NavLink href="/administrative/admin/users">
                <Users className="h-4 w-4" />
                Manage Users
              </NavLink>
              <NavLink href="/administrative/admin/rooms">
                <Building2 className="h-4 w-4" />
                Manage Rooms
              </NavLink>
              <NavLink href="/administrative/admin/activity">
                <Activity className="h-4 w-4" />
                Activity Log
              </NavLink>
              <NavLink href="/administrative/reports">
                <BarChart3 className="h-4 w-4" />
                Reports
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink href="/administrative/admin/public-calendar">
              <CalendarDays className="h-4 w-4" />
              Public Calendar
            </NavLink>
          )}
          {user.role === "ADMIN" && (
            <>
              <NavLink href="/administrative/admin/users">
                <Users className="h-4 w-4" />
                Manage Users
              </NavLink>
              <NavLink href="/administrative/admin/rooms">
                <Building2 className="h-4 w-4" />
                Manage Rooms
              </NavLink>
              <NavLink href="/administrative/admin/activity">
                <Activity className="h-4 w-4" />
                Activity Log
              </NavLink>
            </>
          )}
          <NavLink href="/administrative/help">
            <HelpCircle className="h-4 w-4" />
            Help &amp; Centre
          </NavLink>
          <NavLink href="/administrative/settings">
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </NavSection>
        </nav>
      </SidebarNavProvider>

      <div className="border-t border-sidebar-border bg-[#edf4fd] p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name ?? user.email}
            </p>
            <p className="text-xs text-sidebar-foreground/55">{ROLE_LABELS[user.role]}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/administrative/login" });
            }}
            className="shrink-0"
          >
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
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
