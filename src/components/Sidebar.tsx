import { signOut } from "@/auth";
import { ROLE_LABELS, canManageEvents } from "@/lib/roles";
import type { MinistryRole } from "@/generated/prisma/enums";
import { NavLink } from "./SidebarNav";
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
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">SmartMeeting</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <NavSection label="Main">
          <NavLink href="/">
            <LayoutDashboard className="h-4 w-4 text-blue-500" />
            Dashboard
          </NavLink>
          <NavLink href="/calendar">
            <CalendarDays className="h-4 w-4 text-orange-500" />
            Calendar
          </NavLink>

          <NavLink href="/kanban">
            <KanbanSquare className="h-4 w-4 text-emerald-500" />
            Action Items
          </NavLink>
          <NavLink href="/notifications">
            <Bell className="h-4 w-4 text-amber-500" />
            Notifications
          </NavLink>
        </NavSection>

        {isStaff && (
          <NavSection label="Management">
            <NavLink href="/events/new">
              <PlusCircle className="h-4 w-4 text-violet-500" />
              New Event
            </NavLink>
            <NavLink href="/events">
              <CalendarDays className="h-4 w-4 text-cyan-500" />
              All Events
            </NavLink>
            <NavLink href="/attendance">
              <ClipboardList className="h-4 w-4 text-rose-500" />
              Attendance
            </NavLink>
            <NavLink href="/reports">
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              Reports
            </NavLink>
          </NavSection>
        )}

        <NavSection label="System">
          <NavLink href="/profile">
            <User className="h-4 w-4 text-purple-500" />
            Profile
          </NavLink>
          {user.role === "ADMIN" && (
            <>
              <NavLink href="/admin/users">
                <Users className="h-4 w-4 text-red-500" />
                Manage Users
              </NavLink>
              <NavLink href="/admin/rooms">
                <Building2 className="h-4 w-4 text-yellow-500" />
                Manage Rooms
              </NavLink>
              <NavLink href="/admin/activity">
                <Activity className="h-4 w-4 text-green-500" />
                Activity Log
              </NavLink>
            </>
          )}
          <NavLink href="/help">
            <HelpCircle className="h-4 w-4 text-sky-500" />
            Help &amp; Centre
          </NavLink>
          <NavLink href="/settings">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </NavLink>
        </NavSection>
      </nav>

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
