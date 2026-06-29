import Link from "next/link";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { TrendingUp, Users, CheckCircle2, Activity } from "lucide-react";

export default async function AttendanceReportsPage() {
  await requireStaffRole();

  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      room: { select: { name: true, location: true } },
      venueName: true,
      _count: { select: { attendances: true, attendees: true } },
    },
  });

  const totalCheckins = events.reduce((n, e) => n + e._count.attendances, 0);
  const totalInvited = events.reduce((n, e) => n + e._count.attendees, 0);
  const avgRate = totalInvited > 0 ? Math.round((totalCheckins / totalInvited) * 100) : 0;

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Reports</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Check-in statistics and attendance rates across all events</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5 text-blue-500" />}
          label="Total Events"
          value={events.length}
          sub="events held"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-violet-500" />}
          label="Total Invited"
          value={totalInvited}
          sub="people invited"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="Total Check-ins"
          value={totalCheckins}
          sub="attendees checked in"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          label="Average Rate"
          value={`${avgRate}%`}
          sub="overall attendance rate"
        />
      </div>

      {/* Events table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground">Event</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground">Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground">Location</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-muted-foreground">Invited</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-muted-foreground">Checked In</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-muted-foreground">Rate</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {events.map((e) => {
                const rate =
                  e._count.attendees > 0
                    ? Math.round((e._count.attendances / e._count.attendees) * 100)
                    : 0;

                let rateColor = "text-muted-foreground";
                if (rate >= 80) rateColor = "text-emerald-400";
                else if (rate >= 50) rateColor = "text-amber-400";
                else if (rate > 0) rateColor = "text-red-400";

                return (
                  <tr
                    key={e.id}
                    className="transition-colors hover:bg-muted/40 cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{e.title}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-sm">
                      {e.startAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-sm">
                      {e.room ? `${e.room.name} • ${e.room.location}` : e.venueName ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-md bg-muted/50 px-2 py-1 text-sm font-medium text-foreground">
                        {e._count.attendees}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-md bg-emerald-500/10 px-2 py-1 text-sm font-medium text-emerald-400">
                        {e._count.attendances}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center justify-center rounded-md font-semibold text-sm ${rateColor}`}>
                        {rate}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/administrative/events/${e.id}/attendance`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {events.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">No events found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 transition-all hover:bg-muted/30 hover:border-border/80">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/60">{sub}</p>
    </div>
  );
}
