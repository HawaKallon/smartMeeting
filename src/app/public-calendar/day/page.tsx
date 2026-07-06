import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { getCategoryLabel } from "@/lib/public-event-categories";
import { Clock, MapPin } from "lucide-react";

function parseDate(d?: string): Date | null {
  if (!d) return null;
  const parts = d.split("-");
  if (parts.length !== 3) return null;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(date.getTime())) return null;
  return date;
}

export default async function PublicCalendarDayPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const sp = await searchParams;
  const date = parseDate(sp.d);

  if (!date) {
    return notFound();
  }

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const events = await prisma.publicEvent.findMany({
    where: {
      status: "PUBLISHED",
      startAt: { gte: start, lt: end },
    },
    orderBy: { startAt: "asc" },
  });

  const dateStr = date.toLocaleDateString("default", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Calendar" />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Daily schedule</p>
        <h1 className="mt-2 text-2xl font-bold text-[#003580]">{dateStr}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-[1.5rem] border border-[#d3deef] bg-[#fafdff] p-8 text-center shadow-[0_18px_40px_rgba(0,53,128,0.06)]">
          <p className="text-slate-600">No events scheduled for this day</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/public-calendar/event/${event.id}`}
              className="block rounded-[1.5rem] border border-[#d3deef] bg-[#fafdff] p-5 shadow-[0_18px_40px_rgba(0,53,128,0.06)] transition-colors hover:bg-[#f2f7ff]"
            >
              <h3 className="text-lg font-semibold text-[#003580]">{event.title}</h3>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {event.startAt.toLocaleTimeString("default", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {event.endAt && (
                    <>
                      {" "}
                      -{" "}
                      {event.endAt.toLocaleTimeString("default", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </div>
                {event.venueName && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.venueName}
                  </div>
                )}
                {event.category && (
                  <span className="inline-block rounded-full border border-[#c9d9f2] bg-[#edf3fd] px-3 py-1 text-xs font-medium text-[#003580]">
                    {getCategoryLabel(event.category)}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{event.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
