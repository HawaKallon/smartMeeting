import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canManageExistingEvent, canViewMinutesForEvent } from "@/lib/eventAccess";
import { MinutesEditor } from "./MinutesEditor";
import { ActionItemsPanel } from "./ActionItemsPanel";
import { PublishButton } from "./PublishButton";
import { FileText, CheckCircle, Clock } from "lucide-react";
import { isMinutesArchived, isMinutesEditWindowClosed } from "@/lib/minutesPolicy";
import { isSuperAdmin } from "@/lib/roles";
import { isMinistryAdminLevel } from "@/lib/roles";

type Segment = { speaker: string; start: number; end: number; text: string };

export default async function MinutesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      startAt: true,
      scope: true,
      ministryId: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
      recordings: {
        where: { status: "TRANSCRIBED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { transcript: { select: { segments: true } } },
      },
    },
  });
  if (!event) notFound();
  if (!canViewMinutesForEvent(user, event)) notFound();

  // Lazy-init minutes from transcript text if no record yet.
  const minutesQuery = prisma.minutes.findUnique({
    where: { eventId: id },
    include: {
      drafted: { select: { name: true, email: true } },
      approver: { select: { name: true, email: true } },
      actionItems: {
        include: { owner: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const attendeesQuery = prisma.eventAttendee.findMany({
    where: { eventId: id, status: { in: ["INVITED", "CONFIRMED"] } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const [minutesFromDb, attendees] = await Promise.all([minutesQuery, attendeesQuery]);

  let minutes: typeof minutesFromDb;
  if (!minutesFromDb) {
    const segs = (event.recordings[0]?.transcript?.segments as Segment[] | null) ?? [];
    const body = segs.map((s) => `${s.speaker}: ${s.text}`).join("\n");
    minutes = await prisma.minutes.upsert({
      where: { eventId: id },
      update: {},
      create: { eventId: id, body, draftedById: user.id, draftedAt: new Date() },
      include: {
        drafted: { select: { name: true, email: true } },
        approver: { select: { name: true, email: true } },
        actionItems: {
          include: { owner: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } else {
    minutes = minutesFromDb;
  }
  const users = attendees
    .map((a) => ({
      id: a.user?.id ?? a.id,
      name: a.user?.name ?? a.externalName ?? null,
      email: a.user?.email ?? a.externalEmail ?? "",
    }))
    .filter((p) => p.name || p.email);

  const isAdmin = canManageExistingEvent(user, event);
  const isPublished = minutes.status === "PUBLISHED";

  // Check if minutes are archived (6+ months old)
  const archived = isMinutesArchived(event.startAt);
  const canViewArchived = isSuperAdmin(user.systemRole);


  // Check if edit window is closed (unless user is admin-level)
  const canOverrideEditWindow = isMinistryAdminLevel(user.systemRole);
  const editWindowClosed = isMinutesEditWindowClosed(event.startAt) && !canOverrideEditWindow;
  // const segments = (event.recordings[0]?.transcript?.segments as Segment[] | null) ?? [];
  const segments: Segment[] = [];

  // Serialize dates for client components.
  const itemsForClient = minutes.actionItems.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status as "TODO" | "IN_PROGRESS" | "DONE",
    point: item.point as "ACTION_POINT" | "AGREED",
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    ownerName: item.ownerName,
    owner: item.owner,
  }));

  // Handle archived minutes
  if (archived && !canViewArchived) {
    return (
      <div className="space-y-6">
        <BackButton href={`/administrative/events/${id}`} label={event.title} />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">This record has been archived and is no longer accessible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackButton href={`/administrative/events/${id}`} label={event.title} />
          <h1 className="mt-4 text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-sidebar-primary" />
            {event.scope === "TEAM" ? "Meeting Notes" : "Official Minutes"}
          </h1>
        </div>
        <span
          className={`rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2 ${
            isPublished
              ? "bg-green-500/10 text-green-400"
              : "bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {isPublished ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Published
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" />
              Draft
            </>
          )}
        </span>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Transcript Section — DISABLED FOR NOW */}
        {false && (
          <div className="rounded-lg border border-border bg-card p-6 lg:col-span-1">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcript
            </h2>
            {segments.length > 0 ? (
              <div className="max-h-[600px] space-y-2 overflow-y-auto rounded-lg bg-secondary/30 p-4">
                {segments.map((s, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-xs font-semibold text-sidebar-primary">{s.speaker}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">
                  No transcript available. Upload and transcribe a recording first.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Minutes & Summary Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Minutes & Summary
          </h2>
          {isAdmin ? (
            <>
              {minutes.status === "DRAFT" && !editWindowClosed && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 mb-4">
                  <p className="flex items-center gap-2 text-sm text-amber-400">
                    <Clock className="h-4 w-4" />
                    Minutes can only be edited within 2 days of the meeting. After that they lock automatically for everyone except admins.
                  </p>
                </div>
              )}
              <MinutesEditor
                eventId={id}
                body={minutes.body}
                summary={minutes.summary ?? null}
                status={minutes.status as "DRAFT" | "PUBLISHED"}
                editWindowClosed={editWindowClosed}
              />
              {minutes.status === "DRAFT" && (
                <div className="mt-4">
                  <PublishButton minutesId={minutes.id} eventId={id} />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Meeting Notes
                </p>
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {minutes.body || "—"}
                  </p>
                </div>
              </div>
              {minutes.summary ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </p>
                  <div className="rounded-lg bg-secondary/30 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {minutes.summary}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Action Items Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Action Items
        </h2>
        <ActionItemsPanel
          minutesId={minutes.id}
          eventId={id}
          items={itemsForClient}
          users={users}
          status={minutes.status as "DRAFT" | "PUBLISHED"}
          canEdit={isAdmin}
        />
      </div>

      {/* Publication Status Summary */}
      {isAdmin && minutes.status === "PUBLISHED" && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Publication Status
          </h2>
          <div className="space-y-3 rounded-lg bg-green-500/10 p-4">
            <p className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="h-4 w-4" />
              Published on {minutes.publishedAt?.toLocaleString() ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Minutes are locked for editing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
