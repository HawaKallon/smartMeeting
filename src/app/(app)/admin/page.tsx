import { requireSuperAdmin } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Building2, Users, CalendarDays, ClipboardCheck, Check, X } from "lucide-react";

export default async function PlatformOverviewPage() {
  await requireSuperAdmin();

  const now = new Date();
  const [
    ministriesTotal,
    ministriesActive,
    usersTotal,
    eventsTotal,
    eventsUpcoming,
    attendanceTotal,
    ministries,
  ] = await Promise.all([
    prisma.ministry.count(),
    prisma.ministry.count({ where: { active: true } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.event.count(),
    prisma.event.count({ where: { endAt: { gt: now } } }),
    prisma.attendance.count(),
    prisma.ministry.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, events: true } } },
    }),
  ]);

  const cards = [
    {
      label: "Ministries",
      value: ministriesTotal,
      hint: `${ministriesActive} active`,
      icon: Building2,
    },
    { label: "Users", value: usersTotal, hint: "across all ministries", icon: Users },
    {
      label: "Events",
      value: eventsTotal,
      hint: `${eventsUpcoming} upcoming`,
      icon: CalendarDays,
    },
    { label: "Attendance records", value: attendanceTotal, hint: "all time", icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Super administration</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aggregate activity across all ministries</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="relative overflow-hidden rounded-[1.75rem] border border-[#d3e0f0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-6 shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#003580]" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">{c.label}</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#bfd1ee] bg-[#e4eefc]">
                <c.icon className="h-5 w-5 text-[#003580]" />
              </span>
            </div>
            <p className="mt-6 text-3xl font-semibold tracking-tight text-[#003580]">{c.value}</p>
            <p className="mt-1 text-xs font-medium text-[#4e678f]">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Per-ministry breakdown */}
      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_18px_45px_rgba(15,35,63,0.08)]">
        <div className="border-b border-border bg-secondary/55 px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">By ministry</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email Domain</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Users</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {ministries.map((m, idx) => (
                <tr
                  key={m.id}
                  className={`transition-colors hover:bg-secondary/30 ${idx < ministries.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3 font-medium text-foreground">{m.name}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{m.code}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {m.emailDomain ? `@${m.emailDomain}` : "—"}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{m._count.users}</td>
                  <td className="px-6 py-3 text-muted-foreground">{m._count.events}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                        m.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {m.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {m.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ministries.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No ministries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
