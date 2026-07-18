import { requireUser } from "@/lib/guard";
import type { SystemRole } from "@/generated/prisma/enums";
import { canManageEvents, isSuperAdmin, SYSTEM_ROLE_LABELS } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { getReportAnalytics } from "@/lib/analytics";
import { StatCard, BarList, MonthlyBars, Donut, ChartCard } from "@/components/charts/Charts";
import { ExportButtons } from "./ExportButtons";
import { Users, Building2, DoorOpen, CalendarDays, ClipboardCheck, BadgeCheck } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  MEETING: "Meeting",
  CONFERENCE: "Conference",
  APPOINTMENT: "Appointment",
};
const METHOD_LABELS: Record<string, string> = { QR: "QR code", MANUAL: "Manual", GEO: "Geofence" };

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "#000000",
  MINISTER: "#f59e0b",
  MINISTRY_ADMIN: "#06b6d4",
  STAFF: "#94a3b8",
};
const ROLE_FALLBACK_COLOR = "#94a3b8";

export default async function ReportsPage() {
  const user = await requireUser();

  if (!canManageEvents(user.systemRole) && !isSuperAdmin(user.systemRole)) {
    return (
      <div className="space-y-6">
        <BackButton href="/administrative" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">You don&apos;t have permission to access this page</p>
        </div>
      </div>
    );
  }

  const a = await getReportAnalytics(user);
  const topRole = [...a.users.byRole].sort((left, right) => right.count - left.count)[0];

  // Ministry users see their ministry's name in the subtitle.
  let scopeLabel = "All ministries";
  if (!a.superAdmin && user.ministryId) {
    const ministry = await prisma.ministry.findUnique({
      where: { id: user.ministryId },
      select: { name: true },
    });
    scopeLabel = ministry?.name ?? "Your ministry";
  }

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Insight centre</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">{scopeLabel}</p>
        </div>
        <ExportButtons isSuperAdmin={a.superAdmin} />
      </div>

      {/* Overview */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={a.users.total} hint="excluding super admins" icon={Users} />
          {a.ministries && (
            <StatCard
              label="Ministries"
              value={a.ministries.total}
              hint={`${a.ministries.active} active`}
              icon={Building2}
            />
          )}
          <StatCard label="Rooms" value={a.rooms.total} icon={DoorOpen} />
          <StatCard
            label="Events"
            value={a.events.total}
            hint={`${a.events.upcoming} upcoming`}
            icon={CalendarDays}
          />
          <StatCard label="Check-ins" value={a.attendance.total} hint="all time" icon={ClipboardCheck} />
        </div>
        <ChartCard title="Users by role">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.5rem] border border-[#cfe0f3] bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_55%,#e5f0ff_100%)] p-6 shadow-[0_12px_30px_rgba(15,35,63,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#007236]">Role distribution</p>
                <p className="mt-4 text-4xl font-semibold text-[#003580]">{a.users.total}</p>
                <p className="mt-1 text-sm text-[#4e678f]">Total ministry users in reporting scope</p>
                {topRole && (
                  <div className="mt-5 flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/80 px-4 py-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#003580] text-white">
                      <BadgeCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4e678f]">Largest group</p>
                      <p className="text-sm font-semibold text-[#0f2340]">
                        {SYSTEM_ROLE_LABELS[topRole.role as SystemRole]} · {topRole.count} user{topRole.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-border bg-secondary/35 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#003580]">Share by role</p>
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-white shadow-[inset_0_1px_2px_rgba(15,35,63,0.08)]">
                  {a.users.byRole.map((role) => (
                    <div
                      key={role.role as SystemRole}
                      className="h-full float-left"
                      style={{
                        width: `${a.users.total > 0 ? (role.count / a.users.total) * 100 : 0}%`,
                        backgroundColor: ROLE_COLORS[role.role as SystemRole] ?? ROLE_FALLBACK_COLOR,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {a.users.byRole.map((role) => {
                    const percent = a.users.total > 0 ? Math.round((role.count / a.users.total) * 100) : 0;
                    return (
                      <div key={role.role as SystemRole} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: ROLE_COLORS[role.role as SystemRole] ?? ROLE_FALLBACK_COLOR }}
                          />
                          <span className="font-medium text-foreground">{SYSTEM_ROLE_LABELS[role.role as SystemRole]}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {role.count} · {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {a.users.byRole.map((role) => {
                const percent = a.users.total > 0 ? Math.round((role.count / a.users.total) * 100) : 0;
                const color = ROLE_COLORS[role.role as SystemRole] ?? ROLE_FALLBACK_COLOR;
                return (
                  <div
                    key={role.role as SystemRole}
                    className="rounded-[1.45rem] border border-border bg-card p-5 shadow-[0_12px_28px_rgba(15,35,63,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          {SYSTEM_ROLE_LABELS[role.role as SystemRole]}
                        </p>
                        <p className="mt-3 text-3xl font-semibold text-foreground">{role.count}</p>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${color}1A`, color }}
                      >
                        {percent}%
                      </span>
                    </div>
                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-secondary/75">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>
      </section>

      {/* Events */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Events</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Events created (last 6 months)">
            <MonthlyBars data={a.events.monthly} />
          </ChartCard>
          <ChartCard title="By type">
            <BarList
              data={a.events.byType.map((t) => ({
                label: TYPE_LABELS[t.type] ?? t.type,
                value: t.count,
                color: "#6366f1",
              }))}
            />
          </ChartCard>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Upcoming events" value={a.events.upcoming} icon={CalendarDays} />
          <StatCard label="Past events" value={a.events.past} icon={CalendarDays} />
        </div>
      </section>

      {/* Attendance */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Attendance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total check-ins" value={a.attendance.total} icon={ClipboardCheck} />
          <StatCard
            label="Attendance rate"
            value={`${Math.round(a.attendance.rate * 100)}%`}
            hint={`${a.attendance.total} of ${a.attendance.invited} invited`}
          />
          <StatCard label="Mock-location flags" value={a.attendance.mockLocation} hint="anti-spoofing" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="By check-in method">
            <BarList
              data={a.attendance.byMethod.map((m) => ({
                label: METHOD_LABELS[m.method] ?? m.method,
                value: m.count,
                color: "#10b981",
              }))}
            />
          </ChartCard>
          <ChartCard title="Geofence">
            <Donut
              centerLabel={`${a.attendance.withinGeofence + a.attendance.outsideGeofence} located`}
              segments={[
                { label: "Within geofence", value: a.attendance.withinGeofence, color: "#10b981" },
                { label: "Outside geofence", value: a.attendance.outsideGeofence, color: "#ef4444" },
              ]}
            />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
