import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AvailabilityDatePicker } from "./AvailabilityDatePicker";
import { RoomSelect } from "./RoomSelect";
import type { Prisma } from "@/generated/prisma/client";

type SelectedRoom = Prisma.RoomGetPayload<{
  include: {
    bookings: {
      include: { user: { select: { name: true; email: true } } };
    };
    events: {
      select: {
        id: true;
        title: true;
        startAt: true;
        endAt: true;
        organizer: { select: { name: true } };
      };
    };
  };
}>;

export default async function RoomAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string; date?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true, capacity: true },
  });

  let selectedRoom: SelectedRoom | null = null;
  let selectedDate = new Date();
  let dayBookings: SelectedRoom["bookings"] = [];
  let dayEvents: SelectedRoom["events"] = [];

  if (sp.roomId) {
    if (sp.date) {
      const [year, month, day] = sp.date.split("-").map(Number);
      selectedDate = new Date(year, month - 1, day);
    }

    const startOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    selectedRoom = await prisma.room.findUnique({
      where: { id: sp.roomId },
      include: {
        bookings: {
          where: {
            status: "CONFIRMED",
            startTime: { gte: startOfDay },
            endTime: { lte: endOfDay },
          },
          orderBy: { startTime: "asc" },
          include: { user: { select: { name: true, email: true } } },
        },
        events: {
          where: {
            startAt: { gte: startOfDay },
            endAt: { lte: endOfDay },
          },
          orderBy: { startAt: "asc" },
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            organizer: { select: { name: true } },
          },
        },
      },
    });

    if (selectedRoom) {
      dayBookings = selectedRoom.bookings;
      dayEvents = selectedRoom.events;
    }
  }

  const dateStr = selectedDate.toLocaleString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const allConflicts = [
    ...dayBookings.map((b) => ({
      type: "booking",
      title: `Booking: ${b.purpose}`,
      startTime: b.startTime,
      endTime: b.endTime,
      user: b.user.name || b.user.email,
    })),
    ...dayEvents.map((e) => ({
      type: "event",
      title: e.title,
      startTime: e.startAt,
      endTime: e.endAt,
      user: e.organizer?.name ?? "System",
    })),
  ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Generate available slots (30 min intervals)
  const businessHours = {
    start: 8, // 8 AM
    end: 20, // 8 PM
  };

  const timeSlots = [];
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const slotStart = new Date(selectedDate);
      slotStart.setHours(hour, min, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);

      const isAvailable = !allConflicts.some(
        (c) => c.startTime < slotEnd && c.endTime > slotStart
      );

      timeSlots.push({
        start: slotStart,
        end: slotEnd,
        available: isAvailable,
      });
    }
  }

  return (
    <div className="space-y-6">
      <BackButton href="/administrative/rooms" label="Rooms" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Room Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check room availability and view bookings
        </p>
      </div>

      {/* Room Selector */}
      <div className="rounded-lg border border-border bg-card p-6">
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Select Room
        </label>
        <RoomSelect
          rooms={rooms}
          roomId={sp.roomId || ""}
          date={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`}
        />
      </div>

      {selectedRoom && (
        <>
          {/* Room Info */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {selectedRoom.name}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="mt-1 font-medium text-foreground">{selectedRoom.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedRoom.capacity} people
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conflicts Today</p>
                <p className="mt-1 font-medium text-foreground">
                  {allConflicts.length}
                </p>
              </div>
            </div>
          </div>

          {/* Date Selector */}
          <div className="rounded-lg border border-border bg-card p-6">
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Select Date
            </label>
            <AvailabilityDatePicker
              roomId={sp.roomId ?? ""}
              date={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`}
            />
          </div>

          {/* Time Slots */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Available Time Slots - {dateStr}
            </h3>

            {timeSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No time slots available</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((slot, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border transition-colors ${
                      slot.available
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        slot.available ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {slot.start.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {slot.end.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {slot.available ? "✅ Available" : "❌ Booked"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Existing Bookings & Events */}
          {allConflicts.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Booked Times - {dateStr}
              </h3>
              <div className="space-y-3">
                {allConflicts.map((conflict, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      conflict.type === "booking"
                        ? "border-orange-500/30 bg-orange-500/10"
                        : "border-blue-500/30 bg-blue-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p
                          className={`font-medium ${
                            conflict.type === "booking"
                              ? "text-orange-400"
                              : "text-blue-400"
                          }`}
                        >
                          {conflict.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          By: {conflict.user}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {conflict.startTime.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {conflict.endTime.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Activity Button */}
          <Link
            href={`/administrative/events/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Schedule Activity in This Room
          </Link>
        </>
      )}
    </div>
  );
}
