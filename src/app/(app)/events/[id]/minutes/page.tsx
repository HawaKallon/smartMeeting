import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canManageEvents, canApproveMinutes } from "@/lib/roles";
import { MinutesEditor } from "./MinutesEditor";
import { ActionItemsPanel } from "./ActionItemsPanel";
import { PublishButton } from "./PublishButton";
import { FileText, CheckCircle, Clock, Mic } from "lucide-react";

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
      recordings: {
        where: { status: "TRANSCRIBED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { transcript: { select: { segments: true } } },
      },
    },
  });
  if (!event) notFound();

  // Lazy-init minutes from transcript text if no record yet.
  let minutes = await prisma.minutes.findUnique({
    where: { eventId: id },
    include: {
      actionItems: {
        include: { owner: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!minutes) {
    const segs = (event.recordings[0]?.transcript?.segments as Segment[] | null) ?? [];
    const body = segs.map((s) => `${s.speaker}: ${s.text}`).join("\n");
    minutes = await prisma.minutes.create({
      data: { eventId: id, body },
      include: {
        actionItems: {
          include: { owner: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  const isAdmin = canManageEvents(user.role);
  const isApprover = canApproveMinutes(user.role);
  const isPublished = minutes.status === "PUBLISHED";

  // const segments = (event.recordings[0]?.transcript?.segments as Segment[] | null) ?? [];
  const segments: any[] = [];

  // Serialize dates for client components.
  const itemsForClient = minutes.actionItems.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status as "TODO" | "IN_PROGRESS" | "DONE",
    dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : null,
    owner: item.owner,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackButton href={`/administrative/events/${id}`} label={event.title} />
          <h1 className="mt-4 text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-sidebar-primary" />
            Meeting Minutes
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
            <MinutesEditor
              eventId={id}
              body={minutes.body}
              summary={minutes.summary ?? null}
              published={isPublished}
            />
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
          published={isPublished}
          canEdit={isAdmin}
        />
      </div>

      {/* Approval Section */}
      {isApprover ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Publication Status
          </h2>
          {isPublished ? (
            <div className="space-y-3 rounded-lg bg-green-500/10 p-4">
              <p className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="h-4 w-4" />
                Published on {minutes.publishedAt?.toLocaleString() ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Minutes are locked. Contact an admin to make corrections.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the minutes and action items above, then publish to lock and distribute to all attendees.
              </p>
              <PublishButton minutesId={minutes.id} eventId={id} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
