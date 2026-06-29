import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { Clock, MapPin, Mail, Phone, ExternalLink } from "lucide-react";

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
    <div className="space-y-6">
      <BackButton href="/public-calendar" label="Calendar" />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Banner image */}
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

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="space-y-4">
            {/* Title and ministry */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
              {event.ministry && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Organized by <span className="font-medium">{event.ministry.name}</span>
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
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
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{event.venueName}</span>
                </div>
              )}

              {event.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {event.category}
                </span>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="prose prose-invert max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-foreground">{event.description}</p>
              </div>
            )}

            {/* Contact section */}
            {(event.contactEmail || event.contactPhone) && (
              <div className="border-t border-border pt-6 mt-6">
                <h2 className="font-semibold text-foreground mb-3">Contact</h2>
                <div className="space-y-2">
                  {event.contactEmail && (
                    <a
                      href={`mailto:${event.contactEmail}`}
                      className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Mail className="h-4 w-4" />
                      {event.contactEmail}
                    </a>
                  )}
                  {event.contactPhone && (
                    <a
                      href={`tel:${event.contactPhone}`}
                      className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Phone className="h-4 w-4" />
                      {event.contactPhone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* External link */}
            {event.externalUrl && (
              <div className="pt-6">
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
                >
                  Learn More
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back to calendar link */}
      <div className="text-center">
        <Link href="/public-calendar" className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
          ← Back to calendar
        </Link>
      </div>
    </div>
  );
}
