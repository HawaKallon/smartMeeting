import { requireUser, ministryScope } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Plus, Users, MapPin } from "lucide-react";
import Link from "next/link";
import { CreateRoomForm } from "./CreateRoomForm";
import { RoomFilters } from "./RoomFilters";
import { RoomRowActions } from "./RoomRowActions";

export default async function AdminRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ ministryId?: string }>;
}) {
  const user = await requireUser();

  if (user.role !== "ADMIN" && !isSuperAdmin(user.role)) {
    return (
      <div className="space-y-6">
        <BackButton href="/" label="Dashboard" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">You don't have permission to access this page</p>
        </div>
      </div>
    );
  }

  const superAdmin = isSuperAdmin(user.role);
  const { ministryId } = await searchParams;

  // Load ministries for super-admin's filter and form
  const ministries = superAdmin
    ? await prisma.ministry.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  // Build where clause: scope by ministry + apply optional filter
  let where: any = { ...ministryScope(user) };
  if (superAdmin && ministryId) {
    where.ministryId = ministryId;
  }

  const rooms = await prisma.room.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
      location: true,
      amenities: true,
      ministryId: true,
      ministry: { select: { name: true } },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage conference rooms</p>
        </div>
      </div>

      {/* Create Room Form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Room
        </h2>
        <CreateRoomForm isSuperAdmin={superAdmin} ministries={ministries} />
      </div>

      {/* Filters */}
      {superAdmin && <RoomFilters ministries={ministries} />}

      {/* Rooms List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Room Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Capacity
                </th>
                {superAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ministry
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amenities
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, idx) => (
                <tr
                  key={room.id}
                  className={`transition-colors hover:bg-muted/30 ${idx < rooms.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <span className="font-semibold text-foreground">{room.name}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {room.location}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {room.capacity} people
                    </div>
                  </td>
                  {superAdmin && (
                    <td className="px-6 py-3 text-muted-foreground">
                      {room.ministry?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-6 py-3">
                    {room.amenities && room.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(room.amenities as string[]).map((amenity) => (
                          <span
                            key={amenity}
                            className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{room._count.bookings}</td>
                  <td className="px-6 py-3">
                    <RoomRowActions roomId={room.id} roomName={room.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rooms.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Plus className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No rooms created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
