import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import type { Prisma } from "@/generated/prisma/client";
import type { MinistryRole, EventType, CheckInMethod } from "@/generated/prisma/enums";

// A user with just the fields needed to scope analytics queries.
export type ScopedUser = { role: MinistryRole; ministryId: string | null };

// A sentinel ministry id that matches no real row (cuids never equal this) — used
// when a non-super-admin somehow has no ministry, so they simply see nothing.
const NO_MINISTRY = "__none__";

function eventScope(user: ScopedUser): Prisma.EventWhereInput {
  if (isSuperAdmin(user.role)) return {};
  return { ministryId: user.ministryId ?? NO_MINISTRY };
}

function roomScope(user: ScopedUser): Prisma.RoomWhereInput {
  if (isSuperAdmin(user.role)) return {};
  return { ministryId: user.ministryId ?? NO_MINISTRY };
}

function userScope(user: ScopedUser): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { role: { not: "SUPER_ADMIN" } };
  if (isSuperAdmin(user.role)) return base;
  return { ...base, ministryId: user.ministryId ?? NO_MINISTRY };
}

export type ReportAnalytics = {
  superAdmin: boolean;
  users: { total: number; byRole: { role: MinistryRole; count: number }[] };
  ministries: { total: number; active: number } | null;
  rooms: { total: number };
  events: {
    total: number;
    upcoming: number;
    past: number;
    byType: { type: EventType; count: number }[];
    monthly: { label: string; count: number }[];
  };
  attendance: {
    total: number;
    invited: number;
    rate: number; // 0..1
    byMethod: { method: CheckInMethod; count: number }[];
    withinGeofence: number;
    outsideGeofence: number;
    mockLocation: number;
  };
};

function lastSixMonths(now: Date): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleDateString("en-GB", { month: "short" }) });
  }
  return months;
}

export async function getReportAnalytics(user: ScopedUser): Promise<ReportAnalytics> {
  const superAdmin = isSuperAdmin(user.role);
  const now = new Date();
  const evWhere = eventScope(user);
  const attWhere: Prisma.AttendanceWhereInput = { event: evWhere };
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    usersTotal,
    usersByRoleRaw,
    ministriesTotal,
    ministriesActive,
    roomsTotal,
    eventsTotal,
    eventsUpcoming,
    eventsByTypeRaw,
    eventStartDates,
    attendanceTotal,
    attendanceByMethodRaw,
    withinGeofence,
    outsideGeofence,
    mockLocation,
    invited,
  ] = await Promise.all([
    prisma.user.count({ where: userScope(user) }),
    prisma.user.groupBy({ by: ["role"], where: userScope(user), _count: { _all: true } }),
    superAdmin ? prisma.ministry.count() : Promise.resolve(0),
    superAdmin ? prisma.ministry.count({ where: { active: true } }) : Promise.resolve(0),
    prisma.room.count({ where: roomScope(user) }),
    prisma.event.count({ where: evWhere }),
    prisma.event.count({ where: { ...evWhere, endAt: { gt: now } } }),
    prisma.event.groupBy({ by: ["type"], where: evWhere, _count: { _all: true } }),
    prisma.event.findMany({
      where: { ...evWhere, startAt: { gte: sixMonthsAgo } },
      select: { startAt: true },
    }),
    prisma.attendance.count({ where: attWhere }),
    prisma.attendance.groupBy({ by: ["method"], where: attWhere, _count: { _all: true } }),
    prisma.attendance.count({ where: { ...attWhere, withinGeofence: true } }),
    prisma.attendance.count({ where: { ...attWhere, withinGeofence: false } }),
    prisma.attendance.count({ where: { ...attWhere, mockLocationFlag: true } }),
    prisma.eventAttendee.count({ where: { event: evWhere } }),
  ]);

  // Bucket event start dates into the trailing 6 months.
  const months = lastSixMonths(now);
  const counts: Record<string, number> = {};
  for (const { startAt } of eventStartDates) {
    const key = `${startAt.getFullYear()}-${String(startAt.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return {
    superAdmin,
    users: {
      total: usersTotal,
      byRole: usersByRoleRaw.map((r) => ({ role: r.role, count: r._count._all })),
    },
    ministries: superAdmin ? { total: ministriesTotal, active: ministriesActive } : null,
    rooms: { total: roomsTotal },
    events: {
      total: eventsTotal,
      upcoming: eventsUpcoming,
      past: eventsTotal - eventsUpcoming,
      byType: eventsByTypeRaw.map((t) => ({ type: t.type, count: t._count._all })),
      monthly: months.map((m) => ({ label: m.label, count: counts[m.key] ?? 0 })),
    },
    attendance: {
      total: attendanceTotal,
      invited,
      rate: invited > 0 ? attendanceTotal / invited : 0,
      byMethod: attendanceByMethodRaw.map((m) => ({ method: m.method, count: m._count._all })),
      withinGeofence,
      outsideGeofence,
      mockLocation,
    },
  };
}
