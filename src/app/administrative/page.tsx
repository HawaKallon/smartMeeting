import Link from "next/link";
import { requireUser, ministryScope } from "@/lib/guard";
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
        ? { endAt: { gt: now }, ...ministryScope(user) }
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
        ? { startAt: { gte: startOfDay, lt: tomorrow }, endAt: { gt: now }, ...ministryScope(user) }
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Administrative overview</p>
          <h1 className="mt-2 text-xl font-semibold text-foreground">
            Welcome, {firstName}! 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Link
              href="/administrative/events/new"
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002a68]"
            >
              <PlusCircle className="h-4 w-4" />
              New Event
            </Link>
            <Link
              href="/administrative/attendance"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
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
          variant="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          label="Events Today"
          value={todayCount}
          sub="happening today"
          variant="gold"
        />
        <StatCard
          icon={<CheckSquare className="h-5 w-5 text-emerald-500" />}
          label="My Open Tasks"
          value={myItems}
          sub="action items pending"
          href="/administrative/action-items"
          variant="green"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-violet-500" />}
          label="Pending RSVPs"
          value={pendingRsvps}
          sub="awaiting your response"
          variant="slate"
        />
      </div>

      {/* Upcoming events table */}
      <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_20px_60px_rgba(0,53,128,0.08)]">
        <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-4">
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
            <CalendarDays className="mx-auto h-8 w-8 text-primary/25" />
            <p className="mt-3 text-sm text-muted-foreground">No upcoming events scheduled.</p>
            {isStaff && (
              <Link
                href="/administrative/events/new"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-[#002a68]"
              >
                <PlusCircle className="h-4 w-4" /> Create first event
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
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
                    className={`transition-colors hover:bg-secondary/35 ${i < upcoming.length - 1 ? "border-b border-border/50" : ""}`}
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
                          <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-xs font-medium text-primary">Today</span>
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
                      <span className="rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-medium text-primary capitalize">
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
  icon, label, value, sub, href, variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  href?: string;
  variant: "blue" | "gold" | "green" | "slate";
}) {
  const styles = {
    blue: {
      card: "border-[#c5d7f2] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] hover:border-[#b3c9ee] hover:bg-[linear-gradient(180deg,#f4f9ff_0%,#e8f2ff_100%)]",
      iconWrap: "border-[#bfd1ee] bg-[#e4eefc] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
      value: "text-[#003580]",
      accent: "bg-[#003580]",
      hint: "text-[#4e678f]",
    },
    gold: {
      card: "border-[#f3df9d] bg-[linear-gradient(180deg,#fffdfa_0%,#fff6dc_100%)] hover:border-[#edd27c] hover:bg-[linear-gradient(180deg,#fff9ef_0%,#fff2cd_100%)]",
      iconWrap: "border-[#f0d98e] bg-[#fff0bf] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
      value: "text-[#8f6400]",
      accent: "bg-[#fab700]",
      hint: "text-[#8d6a17]",
    },
    green: {
      card: "border-[#c7e2d0] bg-[linear-gradient(180deg,#f8fffb_0%,#edf8f1_100%)] hover:border-[#b0d5be] hover:bg-[linear-gradient(180deg,#f3fdf7_0%,#e6f5ec_100%)]",
      iconWrap: "border-[#bddbc8] bg-[#e0f2e7] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
      value: "text-[#007236]",
      accent: "bg-[#007236]",
      hint: "text-[#4d7f64]",
    },
    slate: {
      card: "border-[#d6dfec] bg-[linear-gradient(180deg,#fbfdff_0%,#f1f5fb_100%)] hover:border-[#c4d1e2] hover:bg-[linear-gradient(180deg,#f8fbff_0%,#ebf1f9_100%)]",
      iconWrap: "border-[#ced8e6] bg-[#e8eef7] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
      value: "text-[#1f3d67]",
      accent: "bg-[#7d8eab]",
      hint: "text-[#60728d]",
    },
  }[variant];

  const inner = (
    <div className={`relative overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_18px_45px_rgba(15,35,63,0.08)] transition-all ${styles.card}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[1.1rem] border ${styles.iconWrap}`}>
          {icon}
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />}
      </div>
      <div className="mt-6">
        <p className={`text-3xl font-semibold tracking-tight ${styles.value}`}>{value}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
        <p className={`mt-1 text-xs font-medium ${styles.hint}`}>{sub}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
