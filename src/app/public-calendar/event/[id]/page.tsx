import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { categoryStyle, publicDateTime, publicTime } from "@/lib/publicEvents";

export const dynamic = "force-dynamic";

export default async function PublicEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.publicEvent.findFirst({
    where: { id, status: "PUBLISHED" },
    include: { ministry: { select: { name: true } } },
  });
  if (!event) notFound();

  return (
    <article className="mx-auto max-w-4xl">
      <Link href="/public-calendar" className="text-sm font-medium text-emerald-800 hover:underline">← Back to calendar</Link>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {event.bannerImage && (
          <div className="relative aspect-[16/7] bg-slate-100">
            <Image src={event.bannerImage} alt="" fill unoptimized className="object-cover" sizes="(max-width: 896px) 100vw, 896px" />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {event.category && <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoryStyle(event.category)}`}>{event.category}</span>}
            <span className="text-sm text-slate-500">{event.ministry.name}</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{event.title}</h1>
          <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-700 sm:grid-cols-2">
            <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span>{publicDateTime.format(event.startAt)}</span></p>
            <p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span>Ends {publicDateTime.format(event.endAt)} ({publicTime.resolvedOptions().timeZone})</span></p>
            {event.venueName && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span>{event.venueName}</span></p>}
            {event.contactEmail && <a href={`mailto:${event.contactEmail}`} className="flex items-start gap-2 hover:text-emerald-800"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{event.contactEmail}</a>}
            {event.contactPhone && <a href={`tel:${event.contactPhone}`} className="flex items-start gap-2 hover:text-emerald-800"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{event.contactPhone}</a>}
          </div>
          {event.description && <div className="mt-8 whitespace-pre-wrap text-base leading-7 text-slate-700">{event.description}</div>}
          {event.externalUrl && <a href={event.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Visit event website <ExternalLink className="h-4 w-4" /></a>}
        </div>
      </div>
    </article>
  );
}
