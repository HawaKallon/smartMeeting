"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

type Room = { id: string; name: string; location: string; capacity: number };

export function RoomSchedulePreview({
  roomId,
  startAt,
  endAt,
  rooms,
}: {
  roomId: string;
  startAt: string;
  endAt: string;
  rooms: Room[];
}) {
  const [hasConflict, setHasConflict] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === roomId);

  useEffect(() => {
    if (!roomId || !startAt || !endAt) {
      setHasConflict(false);
      return;
    }

    setLoading(true);
    fetch(
      `/api/rooms/${roomId}/schedule?startAt=${startAt}&endAt=${endAt}`
    )
      .then((res) => res.json())
      .then((data) => {
        setHasConflict(data.hasConflict || false);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [roomId, startAt, endAt]);

  if (!roomId || !selectedRoom) return null;

  if (hasConflict) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-400">
          <strong>This room is already booked during your selected time</strong>
        </p>
      </div>
    );
  }

  return null;
}
