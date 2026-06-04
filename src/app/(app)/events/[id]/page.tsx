import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { canManageEvents } from "@/lib/roles";
import { COLOR_META } from "@/lib/colors";
import { Uploader } from "./recordings/Uploader";

type Segment = { speaker: string; start: number; end: number; text: string };

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
      attendances: { orderBy: { checkInAt: "desc" } },
      recordings: {
        orderBy: { createdAt: "desc" },
        include: { transcript: true },
      },
      _count: { select: { attendees: true, attendances: true } },
    },
  });
  if (!event) notFound();

  const isAdmin = canManageEvents(user.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{event.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {event.type} · organized by {event.organizer.name ?? event.organizer.email}
          </p>
        </div>
        {event.colorCategory ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${COLOR_META[event.colorCategory].badge}`}
          >
            {COLOR_META[event.colorCategory].label}
          </span>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-5 text-sm">
        <Row label="Starts">{event.startAt.toLocaleString()}</Row>
        <Row label="Ends">{event.endAt.toLocaleString()}</Row>
        <Row label="Venue">{event.venueName ?? "—"}</Row>
        <Row label="Classification">{event.classification}</Row>
        <Row label="Geofence">
          {event.venueLat != null && event.venueLng != null
            ? `${event.venueLat.toFixed(5)}, ${event.venueLng.toFixed(5)} (±${event.geofenceRadius}m)`
            : "No coordinates set"}
        </Row>
        <Row label="Checked in">{event._count.attendances}</Row>
      </dl>

      {event.description ? (
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{event.description}</p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            Recordings &amp; transcript
          </h2>
          {event.classification === "RESTRICTED" ? (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              Restricted — local transcription tier (Phase 3)
            </span>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="mb-4">
            <Uploader eventId={event.id} />
          </div>
        ) : null}

        {event.recordings.length === 0 ? (
          <p className="text-sm text-gray-500">No recordings uploaded yet.</p>
        ) : (
          <ul className="space-y-4">
            {event.recordings.map((r) => {
              const segments = (r.transcript?.segments as Segment[] | null) ?? [];
              return (
                <li key={r.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {r.createdAt.toLocaleString()} · {r.status}
                      {r.transcript?.provider ? ` · ${r.transcript.provider}` : ""}
                    </span>
                  </div>
                  <audio controls preload="none" className="mb-2 w-full">
                    <source src={r.fileUrl} />
                  </audio>
                  {segments.length > 0 ? (
                    <div className="max-h-60 space-y-1 overflow-y-auto rounded bg-gray-50 p-3 text-sm">
                      {segments.map((s, i) => (
                        <p key={i}>
                          <span className="font-medium text-gray-700">{s.speaker}:</span>{" "}
                          <span className="text-gray-600">{s.text}</span>
                        </p>
                      ))}
                    </div>
                  ) : r.status === "FAILED" ? (
                    <p className="text-sm text-red-600">Transcription failed.</p>
                  ) : (
                    <p className="text-sm text-gray-500">Transcribing…</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdmin ? (
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Admin</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/events/${event.id}/checkin-code`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Check-in QR
            </Link>
            <Link
              href={`/events/${event.id}/attendance`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Attendance & manual check-in
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{children}</dd>
    </div>
  );
}
