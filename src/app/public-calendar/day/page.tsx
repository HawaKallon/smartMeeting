import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { addUtcDays, categoryStyle, dateKey, parseDateKey, publicTime } from "@/lib/publicEvents";

export const dynamic = "force-dynamic";

export default async function PublicCalendarDayPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const selected = parseDateKey(d);
  if (!selected) notFound();
  const end = addUtcDays(selected, 1);
  const events = await prisma.publicEvent.findMany({
    where: { status: "PUBLISHED", startAt: { lt: end }, endAt: { gt: selected } },
    orderBy: { startAt: "asc" },
    include: { ministry: { select: { name: true } } },
  });
  const label = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" }).format(selected);
  const prev = dateKey(addUtcDays(selected, -1));
  const next = dateKey(end);

  return (
    <div className="space-y-6">
      <Link href="/public-calendar" className="text-sm font-medium text-emerald-800 hover:underline">← Back to calendar</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-slate-950">{label}</h1><p className="mt-2 text-slate-600">{events.length} public event{events.length === 1 ? "" : "s"}</p></div>
        <nav className="flex gap-2">
          <Link href={`/public-calendar/day?d=${prev}`} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /> Previous</Link>
          <Link href={`/public-calendar/day?d=${next}`} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Next <ChevronRight className="h-4 w-4" /></Link>
        </nav>
      </div>
      {events.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">No public events are scheduled for this day.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/public-calendar/event/${event.id}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                {event.category && <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryStyle(event.category)}`}>{event.category}</span>}
                <span className="text-xs text-slate-500">{event.ministry.name}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">{event.title}</h2>
              {event.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{event.description}</p>}
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-700" />{publicTime.format(event.startAt)}–{publicTime.format(event.endAt)}</p>
                {event.venueName && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-700" />{event.venueName}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
