import { requireUser } from "@/lib/guard";
import { canManageEvents, isSuperAdmin, ROLE_LABELS } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { getReportAnalytics } from "@/lib/analytics";
import { StatCard, BarList, MonthlyBars, Donut, ChartCard } from "@/components/charts/Charts";
import { ExportButtons } from "./ExportButtons";
import { Users, Building2, DoorOpen, CalendarDays, ClipboardCheck } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  MEETING: "Meeting",
  CONFERENCE: "Conference",
  APPOINTMENT: "Appointment",
};
const METHOD_LABELS: Record<string, string> = { QR: "QR code", MANUAL: "Manual", GEO: "Geofence" };

// Distinct colour per role for the "Users by role" pie.
const ROLE_COLORS: Record<string, string> = {
  MINISTER: "#6366f1",
  PERMANENT_SECRETARY: "#8b5cf6",
  DEPUTY_MINISTER: "#ec4899",
  DEPUTY_SECRETARY: "#f59e0b",
  ADMIN_STAFF: "#10b981",
  ADMIN: "#06b6d4",
};
const ROLE_FALLBACK_COLOR = "#94a3b8";

export default async function ReportsPage() {
  const user = await requireUser();

  if (!canManageEvents(user.role) && !isSuperAdmin(user.role)) {
    return (
      <div className="space-y-6">
        <BackButton href="/" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">You don&apos;t have permission to access this page</p>
        </div>
      </div>
    );
  }

  const a = await getReportAnalytics(user);

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
      <BackButton href="/" label="Dashboard" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
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
          <Donut
            centerLabel={`${a.users.total} users`}
            segments={a.users.byRole.map((r) => ({
              label: ROLE_LABELS[r.role],
              value: r.count,
              color: ROLE_COLORS[r.role] ?? ROLE_FALLBACK_COLOR,
            }))}
          />
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
