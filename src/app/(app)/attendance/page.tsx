import Link from "next/link";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";

export default async function AttendanceReportsPage() {
  await requireStaffRole();

  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      startAt: true,
      venueName: true,
      _count: { select: { attendances: true, attendees: true } },
    },
  });

  const totalCheckins = events.reduce((n, e) => n + e._count.attendances, 0);
  const totalInvited  = events.reduce((n, e) => n + e._count.attendees, 0);

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Reports</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Check-in statistics across all events</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border-l-4 border-[#0f2444] bg-card px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{events.length}</p>
          <p className="text-sm font-medium text-foreground/80">Total Events</p>
        </div>
        <div className="rounded-xl border-l-4 border-green-600 bg-card px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{totalCheckins}</p>
          <p className="text-sm font-medium text-foreground/80">Total Check-ins</p>
        </div>
        <div className="rounded-xl border-l-4 border-blue-500 bg-card px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{totalInvited}</p>
          <p className="text-sm font-medium text-foreground/80">Total Invited</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#f8fafc] text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Venue</th>
              <th className="px-5 py-3 text-center">Invited</th>
              <th className="px-5 py-3 text-center">Checked In</th>
              <th className="px-5 py-3 text-center">Rate</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.map((e) => {
              const rate =
                e._count.attendees > 0
                  ? Math.round((e._count.attendances / e._count.attendees) * 100)
                  : null;
              return (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-foreground">{e.title}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {e.startAt.toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.venueName ?? "—"}</td>
                  <td className="px-5 py-3 text-center text-foreground/80">{e._count.attendees}</td>
                  <td className="px-5 py-3 text-center text-foreground/80">{e._count.attendances}</td>
                  <td className="px-5 py-3 text-center">
                    {rate !== null ? (
                      <span className={`font-medium ${rate >= 80 ? "text-green-600" : rate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                        {rate}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/events/${e.id}/attendance`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Details →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
