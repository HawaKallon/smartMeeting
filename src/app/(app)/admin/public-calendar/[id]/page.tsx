import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { isMinistryAdminLevel, isSuperAdmin } from "@/lib/roles";
import { getCategoryLabel, getCategoryColor } from "@/lib/public-event-categories";
import { BackButton } from "@/components/BackButton";
import { Calendar, MapPin, Edit2, Globe, Lock } from "lucide-react";

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.publicEvent.findUnique({
    where: { id },
    include: { ministry: { select: { name: true } } },
  });

  if (!event) return notFound();

  const canEdit = isMinistryAdminLevel(user.systemRole) || isSuperAdmin(user.systemRole);

  return (
    <div className="space-y-6">
      <BackButton href="/administrative/calendar?view=public" label="Calendar" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
            {event.status === "PUBLISHED" ? (
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-[#cfe5d7] bg-[#edf8f1] px-3 py-1 text-xs font-medium text-[#007236]">
                <Globe className="h-3 w-3" />
                Published
              </span>
            ) : (
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-[#fde8a6] bg-[#fff7dd] px-3 py-1 text-xs font-medium text-[#946200]">
                <Lock className="h-3 w-3" />
                Draft
              </span>
            )}
          </div>
          {event.ministry && (
            <p className="text-sm text-muted-foreground">
              By {event.ministry.name}
            </p>
          )}
        </div>
        {canEdit && (
          <Link
            href={`/administrative/admin/public-calendar/${id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Link>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          icon={<Calendar className="h-5 w-5" />}
          label="Start"
          value={event.startAt.toLocaleString("en-GB", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <InfoCard
          icon={<Calendar className="h-5 w-5" />}
          label="End"
          value={event.endAt.toLocaleString("en-GB", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <InfoCard
          icon={<MapPin className="h-5 w-5" />}
          label="Venue"
          value={event.venueName || "Not specified"}
        />
        {event.category && (
          <InfoCard
            icon={<Globe className="h-5 w-5" />}
            label="Category"
            value={getCategoryLabel(event.category)}
          />
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* Contact & External Link */}
      {(event.contactEmail || event.contactPhone || event.externalUrl) && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Contact & Details
          </h2>
          <div className="space-y-3 text-sm text-foreground">
            {event.contactEmail && (
              <div>
                <span className="font-medium">Email:</span>{" "}
                <a
                  href={`mailto:${event.contactEmail}`}
                  className="text-blue-500 hover:underline"
                >
                  {event.contactEmail}
                </a>
              </div>
            )}
            {event.contactPhone && (
              <div>
                <span className="font-medium">Phone:</span>{" "}
                <a
                  href={`tel:${event.contactPhone}`}
                  className="text-blue-500 hover:underline"
                >
                  {event.contactPhone}
                </a>
              </div>
            )}
            {event.externalUrl && (
              <div>
                <span className="font-medium">External Link:</span>{" "}
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {event.externalUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
