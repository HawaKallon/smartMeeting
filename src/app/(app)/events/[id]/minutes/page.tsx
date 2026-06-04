import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canManageEvents, canApproveMinutes } from "@/lib/roles";
import { MinutesEditor } from "./MinutesEditor";
import { ActionItemsPanel } from "./ActionItemsPanel";
import { PublishButton } from "./PublishButton";

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

  const segments = (event.recordings[0]?.transcript?.segments as Segment[] | null) ?? [];

  // Serialize dates for client components.
  const itemsForClient = minutes.actionItems.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status as "TODO" | "IN_PROGRESS" | "DONE",
    dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : null,
    owner: item.owner,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <BackButton href={`/events/${id}`} label={event.title} />
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meeting Minutes</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isPublished ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {isPublished ? "Published" : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Transcript</h2>
          {segments.length > 0 ? (
            <div className="max-h-[580px] space-y-1 overflow-y-auto text-sm">
              {segments.map((s, i) => (
                <p key={i}>
                  <span className="font-medium text-gray-700">{s.speaker}:</span>{" "}
                  <span className="text-gray-600">{s.text}</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No transcript available. Upload and transcribe a recording first.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Minutes</h2>
          {isAdmin ? (
            <MinutesEditor
              eventId={id}
              body={minutes.body}
              summary={minutes.summary ?? null}
              published={isPublished}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Body</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {minutes.body || "—"}
                </p>
              </div>
              {minutes.summary ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Summary</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {minutes.summary}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Action Items</h2>
        <ActionItemsPanel
          minutesId={minutes.id}
          eventId={id}
          items={itemsForClient}
          users={users}
          published={isPublished}
          canEdit={isAdmin}
        />
      </div>

      {isApprover ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-medium text-gray-700">Approval</h2>
          {isPublished ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">
                Published on {minutes.publishedAt?.toLocaleString() ?? "—"}
              </p>
              <p className="text-xs text-gray-400">
                Minutes are locked. Contact an admin to make corrections.
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-gray-600">
                Review the minutes and action items above, then publish to lock and
                distribute.
              </p>
              <PublishButton minutesId={minutes.id} eventId={id} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
