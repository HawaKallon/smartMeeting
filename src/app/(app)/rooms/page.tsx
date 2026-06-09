import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Calendar, Users, MapPin, Plus } from "lucide-react";
import Link from "next/link";

export default async function RoomsPage() {
  const user = await requireUser();

  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
      location: true,
      amenities: true,
      _count: { select: { bookings: true } },
    },
  });

  // Get today's bookings count
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const todayBookings = await prisma.roomBooking.count({
    where: {
      startTime: { gte: startOfDay, lt: endOfDay },
      status: "CONFIRMED",
    },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">Book conference rooms and spaces</p>
        </div>
        <Link
          href="/events/new"
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Event with Room
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Rooms</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{rooms.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Bookings Today</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{todayBookings}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Capacity</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {rooms.reduce((sum, r) => sum + (r.capacity || 0), 0)}
          </p>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/rooms/${room.id}`}
            className="rounded-xl border border-border bg-card p-6 hover:bg-muted/30 transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                  {room.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {room.location}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Capacity: {room.capacity} people</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{room._count.bookings} bookings</span>
              </div>
            </div>

            {room.amenities && room.amenities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {room.amenities.map((amenity: string) => (
                  <span
                    key={amenity}
                    className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            )}

            <button className="mt-4 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              View Availability
            </button>
          </Link>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No rooms available</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Contact your administrator to add rooms</p>
        </div>
      )}
    </div>
  );
}
