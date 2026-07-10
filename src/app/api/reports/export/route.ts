import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { toCsv, type CsvColumn } from "@/lib/csv";
import type { SystemRole } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { SYSTEM_ROLE_LABELS } from "@/lib/roles";

const NO_MINISTRY = "__none__";

function csvResponse(filename: string, body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { systemRole, ministryId } = session.user;
  const superAdmin = isSuperAdmin(systemRole);
  // Re-derive scope from the session — never trust a query param for tenancy.
  const scopeId = superAdmin ? undefined : ministryId ?? NO_MINISTRY;

  const dataset = req.nextUrl.searchParams.get("dataset") ?? "events";

  if (dataset === "events") {
    const where: Prisma.EventWhereInput = { scope: "OFFICIAL", ...(scopeId ? { ministryId: scopeId } : {}) };
    const rows = await prisma.event.findMany({
      where,
      orderBy: { startAt: "desc" },
      include: { ministry: { select: { name: true } }, organizer: { select: { name: true } } },
    });
    const cols: CsvColumn<(typeof rows)[number]>[] = [
      { header: "Title", value: (r) => r.title },
      { header: "Type", value: (r) => r.type },
      { header: "Start", value: (r) => r.startAt },
      { header: "End", value: (r) => r.endAt },
      { header: "Venue", value: (r) => r.venueName },
      { header: "Organizer", value: (r) => r.organizer?.name },
      { header: "Ministry", value: (r) => r.ministry?.name },
      { header: "Classification", value: (r) => r.classification },
    ];
    return csvResponse("events.csv", toCsv(rows, cols));
  }

  if (dataset === "attendance") {
    const where: Prisma.AttendanceWhereInput = { event: { scope: "OFFICIAL", ...(scopeId ? { ministryId: scopeId } : {}) } };
    const rows = await prisma.attendance.findMany({
      where,
      orderBy: { checkInAt: "desc" },
      include: { event: { select: { title: true } }, user: { select: { name: true, email: true } } },
    });
    const cols: CsvColumn<(typeof rows)[number]>[] = [
      { header: "Event", value: (r) => r.event?.title },
      { header: "Attendee", value: (r) => r.user?.name ?? r.externalName },
      { header: "Email", value: (r) => r.user?.email ?? r.externalEmail },
      { header: "Method", value: (r) => r.method },
      { header: "Checked in", value: (r) => r.checkInAt },
      { header: "Within geofence", value: (r) => r.withinGeofence },
      { header: "GPS accuracy (m)", value: (r) => r.gpsAccuracy },
      { header: "Mock location", value: (r) => r.mockLocationFlag },
    ];
    return csvResponse("attendance.csv", toCsv(rows, cols));
  }

  if (dataset === "users") {
    const where: Prisma.UserWhereInput = {
      systemRole: { not: "SUPER_ADMIN" },
      ...(scopeId ? { ministryId: scopeId } : {}),
    };
    const rows = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { ministry: { select: { name: true } } },
    });
    const cols: CsvColumn<(typeof rows)[number]>[] = [
      { header: "Name", value: (r) => r.name },
      { header: "Email", value: (r) => r.email },
      { header: "Role", value: (r) => SYSTEM_ROLE_LABELS[r.systemRole as SystemRole] || "Unknown" },
      { header: "Ministry", value: (r) => r.ministry?.name },
      { header: "Active", value: (r) => r.active },
      { header: "Created", value: (r) => r.createdAt },
    ];
    return csvResponse("users.csv", toCsv(rows, cols));
  }

  if (dataset === "ministries") {
    // Platform-level data — super-admins only.
    if (!superAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const rows = await prisma.ministry.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, events: true } } },
    });
    const cols: CsvColumn<(typeof rows)[number]>[] = [
      { header: "Name", value: (r) => r.name },
      { header: "Code", value: (r) => r.code },
      { header: "Email domain", value: (r) => r.emailDomain },
      { header: "Active", value: (r) => r.active },
      { header: "Users", value: (r) => r._count.users },
      { header: "Events", value: (r) => r._count.events },
      { header: "Created", value: (r) => r.createdAt },
    ];
    return csvResponse("ministries.csv", toCsv(rows, cols));
  }

  return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });
}
