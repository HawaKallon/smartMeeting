"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { COLOR_META } from "@/lib/colors";
import type { ColorCategory } from "@/generated/prisma/enums";

interface UpcomingEventRowProps {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  room: { name: string; location: string } | null;
  type: string;
  colorCategory: ColorCategory | null;
  attendanceCount: number;
  startOfDay: Date;
  tomorrow: Date;
}

export function UpcomingEventRow({
  id,
  title,
  startAt,
  endAt,
  room,
  type,
  colorCategory,
  attendanceCount,
  startOfDay,
  tomorrow,
}: UpcomingEventRowProps) {
  const router = useRouter();
  const isToday = startAt >= startOfDay && startAt < tomorrow;

  const handleRowClick = () => {
    router.push(`/administrative/events/${id}`);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <tr
      onClick={handleRowClick}
      className="cursor-pointer transition-colors hover:bg-secondary/35"
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          {colorCategory ? (
            <span
              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${COLOR_META[colorCategory].dot}`}
            />
          ) : (
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30" />
          )}
          <span className="font-medium text-foreground">{title}</span>
          {isToday && (
            <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-xs font-medium text-primary">
              Today
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3 text-muted-foreground">
        {startAt.toLocaleString("en-GB", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="px-5 py-3 text-muted-foreground">
        {room ? `${room.name} (${room.location})` : "—"}
      </td>
      <td className="px-5 py-3">
        <span className="rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-medium text-primary capitalize">
          {type.toLowerCase()}
        </span>
      </td>
      <td className="px-5 py-3 font-medium text-foreground">{attendanceCount}</td>
      <td className="px-5 py-3" onClick={handleLinkClick}>
        <Link
          href={`/administrative/events/${id}`}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Open →
        </Link>
      </td>
    </tr>
  );
}
