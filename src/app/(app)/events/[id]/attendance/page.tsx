import { notFound } from "next/navigation";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { ManualCheckInForm } from "./ManualCheckInForm";
import { Users, CheckCircle } from "lucide-react";

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
      attendees: {
        where: { userId: { not: null } },
        select: { userId: true, user: { select: { id: true, name: true, email: true } } },
      },
      attendances: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { checkInAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  // Build list of invitees not yet checked in.
  const checkedInUserIds = new Set(event.attendances.map((a) => a.userId).filter(Boolean));
  const invitedUsers = event.attendees
    .filter((a) => a.user && !checkedInUserIds.has(a.user.id))
    .map((a) => ({
      id: a.user!.id,
      name: a.user!.name,
      email: a.user!.email,
    }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <BackButton href={`/events/${id}`} label={event.title} />
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="h-8 w-8 text-sidebar-primary" />
          Attendance
        </h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          Manual check-in
        </h2>
        <ManualCheckInForm eventId={id} invitedUsers={invitedUsers} />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Checked in ({event.attendances.length})
        </h2>
        {event.attendances.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No one has checked in yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Attendee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Check-in Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Geofence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {event.attendances.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-foreground font-medium">
                      {a.user?.name ?? a.user?.email ?? a.externalName ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {a.checkInAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {a.method === "QR" ? "QR Code" : a.method === "GEO" ? "Geolocation" : "Manual"}
                    </td>
                    <td className="px-6 py-3">
                      {a.withinGeofence === null ? (
                        <span className="text-muted-foreground/60">n/a</span>
                      ) : a.withinGeofence ? (
                        <span className="text-green-400">✓ Inside</span>
                      ) : (
                        <span className="text-red-400">✗ Outside</span>
                      )}
                      {a.mockLocationFlag ? (
                        <span className="ml-2 text-amber-400" title="Mock location flagged">
                          ⚠
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
