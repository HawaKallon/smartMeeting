import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ministryScope } from "@/lib/guard";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { id: roomId } = await params;
    const startAtStr = request.nextUrl.searchParams.get("startAt");
    const endAtStr = request.nextUrl.searchParams.get("endAt");

    if (!roomId || !startAtStr || !endAtStr) {
      return NextResponse.json({
        events: [],
        hasConflict: false,
      });
    }

    // Enforce tenancy: the room must belong to the caller's ministry (super-admins bypass).
    // 404 (not 403) so room ids can't be probed across ministries.
    const room = await prisma.room.findFirst({
      where: { id: roomId, ...ministryScope(user) } as Prisma.RoomWhereInput,
      select: { id: true },
    });
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const startAt = new Date(startAtStr);
    const endAt = new Date(endAtStr);

    // Get events for this room
    const events = await prisma.event.findMany({
      where: {
        roomId,
        startAt: { lt: new Date(endAt.getTime() + 24 * 60 * 60 * 1000) },
        endAt: { gt: new Date(startAt.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        organizer: { select: { name: true } },
      },
    });

    // Get bookings for this room
    const bookings = await prisma.roomBooking.findMany({
      where: {
        roomId,
        status: "CONFIRMED",
        startTime: { lt: new Date(endAt.getTime() + 24 * 60 * 60 * 1000) },
        endTime: { gt: new Date(startAt.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        purpose: true,
        startTime: true,
        endTime: true,
        user: { select: { name: true } },
      },
    });

    // Check for conflicts
    const hasConflict =
      events.some((e) => e.startAt < endAt && e.endAt > startAt) ||
      bookings.some((b) => b.startTime < endAt && b.endTime > startAt);

    // Combine and format
    const allSchedule = [
      ...events.map((e) => ({
        id: e.id,
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        type: "event" as const,
        organizer: e.organizer.name || "Unknown",
      })),
      ...bookings.map((b) => ({
        id: b.id,
        title: `Booking: ${b.purpose}`,
        startAt: b.startTime,
        endAt: b.endTime,
        type: "booking" as const,
        organizer: b.user.name || "Unknown",
      })),
    ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    return NextResponse.json({
      events: allSchedule,
      hasConflict,
    });
  } catch (error) {
    console.error("Room schedule error:", error);
    return NextResponse.json(
      { events: [], hasConflict: false },
      { status: 500 }
    );
  }
}
