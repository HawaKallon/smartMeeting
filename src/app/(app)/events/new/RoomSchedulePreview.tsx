"use client";

import { useEffect, useMemo, useState } from "react";
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

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const scheduleUrl = useMemo(() => {
    if (!roomId || !startAt || !endAt) return null;
    return `/api/rooms/${roomId}/schedule?startAt=${startAt}&endAt=${endAt}`;
  }, [roomId, startAt, endAt]);

  useEffect(() => {
    if (!scheduleUrl) return;

    let ignore = false;
    fetch(scheduleUrl)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        setHasConflict(data.hasConflict || false);
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [scheduleUrl]);

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
