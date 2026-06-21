"use client";

import { useRouter } from "next/navigation";

type Room = { id: string; name: string; capacity: number; location: string };

/** Room filter for the availability page — selects a room and navigates. */
export function RoomSelect({
  rooms,
  roomId,
  date,
}: {
  rooms: Room[];
  roomId: string;
  date: string;
}) {
  const router = useRouter();
  return (
    <select
      value={roomId}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/rooms/availability?roomId=${e.target.value}&date=${date}`);
        }
      }}
      className="mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
    >
      <option value="">Choose a room...</option>
      {rooms.map((room) => (
        <option key={room.id} value={room.id}>
          {room.name} ({room.capacity} people) - {room.location}
        </option>
      ))}
    </select>
  );
}
