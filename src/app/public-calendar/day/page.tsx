import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
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
      <BackButton href="/public-calendar" label="Calendar" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">{dateStr}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No events scheduled for this day</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/public-calendar/event/${event.id}`}
              className="block rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold text-foreground text-lg">{event.title}</h3>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                  <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium">
                    {event.category}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
