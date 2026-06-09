import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const startAtStr = request.nextUrl.searchParams.get("startAt");
    const endAtStr = request.nextUrl.searchParams.get("endAt");

    if (!roomId || !startAtStr || !endAtStr) {
      return NextResponse.json({
        events: [],
        hasConflict: false,
      });
    }

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
