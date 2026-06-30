import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canManageEvents, canApproveMinutes, canManageEvent, canReassignEvent } from "@/lib/roles";
import { canViewMinutesForEvent } from "@/lib/eventAccess";
import { COLOR_META } from "@/lib/colors";
import { ManageCoOrganizers } from "./ManageCoOrganizers";
// import { Uploader } from "./recordings/Uploader";
// import { MeetingRecorder } from "./recordings/MeetingRecorder";
import { RsvpButtons } from "./RsvpButtons";
import { BackButton } from "@/components/BackButton";
// import { AudioPlayer } from "@/components/AudioPlayer";
import { Calendar, MapPin, Users, Download, Edit, FileText, Zap, Repeat } from "lucide-react";
import { describeRecurrence } from "@/lib/recurrence";
import { CancelEventButton } from "./CancelEventButton";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { name: true, email: true } },
      coOrganizers: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, name: true, location: true, capacity: true } },
      attendances: { orderBy: { checkInAt: "desc" } },
      recordings: {
        orderBy: { createdAt: "desc" },
        include: { transcript: true },
      },
      series: true,
      _count: { select: { attendees: true, attendances: true } },
    },
  });
  if (!event) return notFound();

  const coOrganizerIds = event.coOrganizers.map((c) => c.id);
  const eventPerm = {
    ministryId: event.ministryId,
    organizerId: event.organizerId,
    coOrganizerIds,
  };
  const isAdmin = canManageEvents(user.role);
  const canManage = canManageEvent(user, eventPerm);
  const canReassign = canReassignEvent(user, eventPerm);
  const canViewMinutes = canViewMinutesForEvent(user, {
    ministryId: event.ministryId,
    organizerId: event.organizerId,
    coOrganizers: event.coOrganizers,
  });

  // Eligible co-organizer candidates: same-ministry users who aren't already
  // the organizer or a co-organizer (only needed when the viewer can reassign).
  const candidates = canReassign
    ? await prisma.user.findMany({
        where: {
          ministryId: event.ministryId,
          role: { not: "SUPER_ADMIN" },
          id: { notIn: [event.organizerId, ...coOrganizerIds] },
        },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      })
    : [];

  const myInvite = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId: id, userId: user.id } },
    select: { id: true, status: true },
  });

  return (
    <div className="flex flex-col h-full gap-6">
      <BackButton href="/administrative" label="Dashboard" />

      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
            <span className="capitalize">{event.type.toLowerCase()}</span> •
            <span>
              By {event.organizer.name ?? event.organizer.email}
              {event.coOrganizers.length > 0 &&
                ` + ${event.coOrganizers.map((c) => c.name ?? c.email).join(", ")}`}
            </span>
            {event.series && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
                <Repeat className="h-3 w-3" />
                {describeRecurrence(event.series)}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Link
              href={`/administrative/events/${id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          )}
          {canManage && (
            <CancelEventButton eventId={id} isSeries={!!event.seriesId} />
          )}
          <button className="flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
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
          label="Room"
          value={event.room ? `${event.room.name} (${event.room.location})` : "Not assigned"}
        />
        <InfoCard
          icon={<Users className="h-5 w-5" />}
          label="Attendance"
          value={`${event._count.attendances}/${event._count.attendees} checked in`}
        />
      </div>

      {/* Organizer / assistants */}
      {(canReassign || event.coOrganizers.length > 0) && (
        <div className="rounded-xl border border-border bg-card p-6 flex-shrink-0">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4" />
            Organizer &amp; Assistants
          </h2>
          <p className="mb-4 text-sm text-foreground">
            <span className="font-medium">{event.organizer.name ?? event.organizer.email}</span>
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Organizer
            </span>
          </p>
          {canReassign ? (
            <ManageCoOrganizers
              eventId={id}
              coOrganizers={event.coOrganizers}
              candidates={candidates}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {event.coOrganizers.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
                >
                  {c.name ?? c.email}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* RSVP Section */}
      {myInvite && (
        <div className="rounded-xl border border-border bg-card p-6 flex-shrink-0">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your RSVP</h2>
          <RsvpButtons eventId={id} currentStatus={myInvite.status} />
        </div>
      )}

      {/* Event Actions */}
      {(canManage || canViewMinutes) && (
        <div className="rounded-xl border border-border bg-card p-6 flex-shrink-0">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {canManage ? (
              <>
                <ActionButton
                  href={`/administrative/events/${id}/attendees`}
                  icon={<Users className="h-4 w-4" />}
                  label="Attendees"
                />
                <ActionButton
                  href={`/administrative/events/${id}/letters`}
                  icon={<FileText className="h-4 w-4" />}
                  label="Letters"
                />
                <ActionButton
                  href={`/administrative/events/${id}/checkin-code`}
                  icon={<Zap className="h-4 w-4" />}
                  label="Check-in QR"
                />
                <ActionButton
                  href={`/administrative/events/${id}/attendance`}
                  icon={<Users className="h-4 w-4" />}
                  label="Attendance"
                />
                <ActionButton
                  href={`/administrative/events/${id}/report`}
                  icon={<FileText className="h-4 w-4" />}
                  label="Write Report"
                />
              </>
            ) : null}
            {canViewMinutes ? (
              <ActionButton
                href={`/administrative/events/${id}/minutes`}
                icon={<FileText className="h-4 w-4" />}
                label="Meeting Minutes"
              />
            ) : null}
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActionButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 hover:bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
