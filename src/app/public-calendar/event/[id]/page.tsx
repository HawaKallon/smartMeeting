import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { getCategoryLabel } from "@/lib/public-event-categories";
import { Clock, MapPin, Mail, Phone } from "lucide-react";

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;

  const event = await prisma.publicEvent.findUnique({
    where: { id: p.id },
    include: { ministry: { select: { name: true, code: true } } },
  });

  if (!event || event.status !== "PUBLISHED") {
    return notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <BackButton href="/" label="Back to Calendar" />

      <div className="overflow-hidden rounded-[2rem] border border-[#d3deef] bg-[#fafdff] shadow-[0_24px_70px_rgba(0,53,128,0.08)]">
        {event.bannerImage && (
          <div className="relative w-full h-64 sm:h-96">
            <Image
              src={event.bannerImage}
              alt={event.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Published public event</p>
              <h1 className="mt-2 text-3xl font-bold text-[#003580]">{event.title}</h1>
              {event.ministry && (
                <p className="mt-2 text-sm text-slate-600">
                  Organized by <span className="font-medium">{event.ministry.name}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4" />
                <span>
                  {event.startAt.toLocaleDateString("default", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {event.startAt.toLocaleTimeString("default", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {event.endAt && (
                    <>
                      {" "}
                      —{" "}
                      {event.endAt.toLocaleTimeString("default", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </span>
              </div>

              {event.venueName && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>{event.venueName}</span>
                </div>
              )}

              {event.category && (
                <span className="inline-flex items-center rounded-full border border-[#c9d9f2] bg-[#edf3fd] px-3 py-1 text-xs font-medium text-[#003580]">
                  {getCategoryLabel(event.category)}
                </span>
              )}
            </div>

            {event.description && (
              <div className="max-w-none rounded-[1.5rem] bg-[#edf4fd] p-5">
                <p className="whitespace-pre-wrap text-slate-800">{event.description}</p>
              </div>
            )}

            {(event.contactEmail || event.contactPhone) && (
              <div className="mt-6 border-t border-[#d3deef] pt-6">
                <h2 className="mb-3 font-semibold text-slate-900">Contact</h2>
                <div className="space-y-2">
                  {event.contactEmail && (
                    <a
                      href={`mailto:${event.contactEmail}`}
                      className="flex items-center gap-2 text-sm text-[#003580] hover:text-[#00265b]"
                    >
                      <Mail className="h-4 w-4" />
                      {event.contactEmail}
                    </a>
                  )}
                  {event.contactPhone && (
                    <a
                      href={`tel:${event.contactPhone}`}
                      className="flex items-center gap-2 text-sm text-[#003580] hover:text-[#00265b]"
                    >
                      <Phone className="h-4 w-4" />
                      {event.contactPhone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* {event.externalUrl && (
              <div className="pt-6">
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003580] px-5 py-3 font-medium text-white transition-colors hover:bg-[#00265b]"
                >
                  Learn More
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
}
