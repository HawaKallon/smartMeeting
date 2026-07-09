import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Calendar, MapPin, Users, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  await requireUser();

  const room = await prisma.room.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        where: { status: "CONFIRMED" },
        orderBy: { startTime: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      events: {
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          organizer: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!room) {
    return (
      <div className="space-y-6">
        <BackButton href="/administrative/rooms" label="Rooms" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">Room not found</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingBookings = room.bookings.filter((b) => b.endTime > today);
  const upcomingEvents = room.events.filter((e) => e.endAt > today);

  return (
    <div className="space-y-6">
      <BackButton href="/administrative/rooms" label="Rooms" />

      {/* Room Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{room.name}</h1>
            <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {room.location}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {room.capacity} capacity
              </div>
            </div>
          </div>
          <Link
            href="/administrative/rooms/book"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Book Room
          </Link>
        </div>

        {/* Amenities */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Amenities
            </p>
            <div className="flex flex-wrap gap-2">
              {(room.amenities as string[]).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Bookings & Events */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bookings */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Calendar className="h-5 w-5" />
              Room Bookings
            </h2>
          </div>

          <div className="divide-y divide-border">
            {upcomingBookings.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">No upcoming bookings</p>
              </div>
            ) : (
              upcomingBookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {booking.purpose}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.user.name || booking.user.email}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      <div>{new Date(booking.startTime).toLocaleDateString()}</div>
                      <div className="text-foreground">
                        {new Date(booking.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(booking.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  {booking.attendeeCount && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {booking.attendeeCount} attendees
                    </div>
                  )}
                  {booking.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic">&quot;{booking.notes}&quot;</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Events */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Calendar className="h-5 w-5" />
              Scheduled Events
            </h2>
          </div>

          <div className="divide-y divide-border">
            {upcomingEvents.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">No scheduled events</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/administrative/events/${event.id}`}
                  className="block px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground hover:text-foreground/80">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.organizer.name || event.organizer.email}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      <div>{new Date(event.startAt).toLocaleDateString()}</div>
                      <div className="text-foreground">
                        {new Date(event.startAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(event.endAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Conflict Warning */}
      {upcomingBookings.length > 0 && upcomingEvents.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Booking & Event Overlap</p>
            <p className="text-xs text-amber-400/80 mt-1">
              This room has both bookings and scheduled events. Make sure times don&apos;t conflict.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
