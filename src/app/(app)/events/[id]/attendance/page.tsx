import { notFound } from "next/navigation";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { manualCheckIn } from "./actions";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaffRole();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendances: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { checkInAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <BackButton href={`/events/${id}`} label={event.title} />
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
      </div>

      <section className="rounded-xl border border-gray-200 bg-card p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground/80">
          Manual check-in (fallback)
        </h2>
        <form action={manualCheckIn} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="eventId" value={event.id} />
          <div>
            <label className="block text-xs text-muted-foreground">Registered user</label>
            <select name="userId" className="mt-1 rounded-md border px-2 py-1.5 text-sm">
              <option value="">— select —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">or external guest</label>
            <input
              name="externalName"
              placeholder="Full name"
              className="mt-1 rounded-md border px-2 py-1.5 text-sm"
            />
          </div>
          <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
            Check in
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground/80">
          Checked in ({event.attendances.length})
        </h2>
        {event.attendances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one has checked in yet.</p>
        ) : (
          <table className="w-full overflow-hidden rounded-xl border border-gray-200 bg-card text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-muted-foreground/60">
              <tr>
                <th className="px-3 py-2">Attendee</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Geofence</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {event.attendances.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2 text-foreground">
                    {a.user?.name ?? a.user?.email ?? a.externalName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {a.checkInAt.toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{a.method}</td>
                  <td className="px-3 py-2">
                    {a.withinGeofence === null ? (
                      <span className="text-muted-foreground/60">n/a</span>
                    ) : a.withinGeofence ? (
                      <span className="text-green-600">inside</span>
                    ) : (
                      <span className="text-red-600">outside</span>
                    )}
                    {a.mockLocationFlag ? (
                      <span className="ml-1 text-amber-600" title="Mock location flagged">
                        ⚠
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
