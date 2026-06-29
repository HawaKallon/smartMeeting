import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canManageEvents, canViewMinistrySchedule } from "@/lib/roles";
import { COLOR_META } from "@/lib/colors";
import {
  CalendarDays, CheckSquare, Users, TrendingUp,
  ArrowUpRight, PlusCircle, ClipboardList,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import type { ColorCategory } from "@/generated/prisma/enums";

export default async function Dashboard() {
  const user = await requireUser();
  const isStaff = canManageEvents(user.role);
  const canViewAll = canViewMinistrySchedule(user.role);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(startOfDay.getTime() + 86_400_000);

  const [upcoming, todayCount, myItems, pendingRsvps] = await Promise.all([
    prisma.event.findMany({
      where: canViewAll
        ? { endAt: { gt: now } }
        : { endAt: { gt: now }, organizerId: user.id },
      orderBy: { startAt: "asc" },
      take: 10,
      select: {
        id: true, title: true, startAt: true, endAt: true,
        room: { select: { name: true, location: true } },
        type: true, colorCategory: true,
        _count: { select: { attendances: true, attendees: true } },
      },
    }),
    prisma.event.count({
      where: canViewAll
        ? { startAt: { gte: startOfDay, lt: tomorrow }, endAt: { gt: now } }
        : { startAt: { gte: startOfDay, lt: tomorrow }, endAt: { gt: now }, organizerId: user.id },
    }),
    prisma.actionItem.count({ where: { ownerId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } } }),
    prisma.eventAttendee.count({ where: { userId: user.id, status: "INVITED" } }),
  ]);

  
  const firstName = user.name?.split(" ")[0] ?? user.email.split("@")[0];

  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Home" />

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome, {firstName}! 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Link
              href="/administrative/events/new"
              className="flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              New Event
            </Link>
            <Link
              href="/administrative/attendance"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Reports
            </Link>
          </div>
        )}
      </div>

      {/* Stat cards — Square UI exact structure */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
          label="Upcoming Events"
          value={upcoming.length}
          sub="scheduled ahead"
          href="/administrative/calendar"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          label="Events Today"
          value={todayCount}
          sub="happening today"
        />
        <StatCard
          icon={<CheckSquare className="h-5 w-5 text-emerald-500" />}
          label="My Open Tasks"
          value={myItems}
          sub="action items pending"
          href="/administrative/kanban"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-violet-500" />}
          label="Pending RSVPs"
          value={pendingRsvps}
          sub="awaiting your response"
        />
      </div>

      {/* Upcoming events table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Upcoming Events</h2>
          <Link
            href="/administrative/calendar"
            className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">No upcoming events scheduled.</p>
            {isStaff && (
              <Link
                href="/administrative/events/new"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
              >
                <PlusCircle className="h-4 w-4" /> Create first event
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Event", "Date & Time", "Venue", "Type", "Check-ins", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e, i) => {
                const isToday = e.startAt >= startOfDay && e.startAt < tomorrow;
                return (
                  <tr
                    key={e.id}
                    className={`transition-colors hover:bg-muted/30 ${i < upcoming.length - 1 ? "border-b border-border/50" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {e.colorCategory ? (
                          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${COLOR_META[e.colorCategory as ColorCategory].dot}`} />
                        ) : (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30" />
                        )}
                        <span className="font-medium text-foreground">{e.title}</span>
                        {isToday && (
                          <span className="rounded-md bg-blue-500/15 px-1.5 py-0.5 text-xs font-medium text-blue-400">Today</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.startAt.toLocaleString("en-GB", {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.room ? `${e.room.name} (${e.room.location})` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                        {e.type.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{e._count.attendances}</td>
                    <td className="px-5 py-3">
                      <Link href={`/administrative/events/${e.id}`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, href,
}: {
  icon: React.ReactNode; label: string; value: number; sub: string; href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
          {icon}
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground/30" />}
      </div>
      <p className="mt-3 text-2xl font-medium text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/60">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
