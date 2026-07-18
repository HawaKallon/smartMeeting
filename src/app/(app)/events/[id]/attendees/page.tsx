import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { canManageExistingEvent } from "@/lib/eventAccess";
import { removeInvite, manualCheckInAction } from "./actions";
import { AddAttendeeForm } from "./AddAttendeeForm";
import { WalkInCheckInForm } from "./WalkInCheckInForm";
import { Users, CheckCircle, Clock, XCircle } from "lucide-react";

export default async function AttendeesPage({
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
      ministryId: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
      attendees: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      attendances: {
        select: { userId: true, checkInAt: true, withinGeofence: true, method: true },
      },
    },
  });
  if (!event) notFound();
  if (!canManageExistingEvent(user, event)) notFound();

  const checkinsByUserId = new Map(
    event.attendances.map((a) => [a.userId, a])
  );

  const invitedUserIds = event.attendees
    .map((a) => a.userId)
    .filter((uid): uid is string => uid !== null);

  const allUsers = await prisma.user.findMany({
    where: {
      ministryId: event.ministryId,
      systemRole: { not: "SUPER_ADMIN" },
    },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  const uninvitedUsers = allUsers.filter((u) => !invitedUserIds.includes(u.id));

  const confirmed = event.attendees.filter((a) => a.status === "CONFIRMED").length;
  const declined = event.attendees.filter((a) => a.status === "DECLINED").length;
  const pending = event.attendees.filter((a) => a.status === "INVITED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackButton href={`/administrative/events/${id}`} label={event.title} />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Attendees</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage event attendees and invitations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Confirmed
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{confirmed}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{pending}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <XCircle className="h-4 w-4 text-red-500" />
            Declined
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{declined}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            Checked In
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{event.attendances.length}</p>
        </div>
      </div>

      {/* Add Attendee Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Add Attendee
        </h2>
        <AddAttendeeForm eventId={id} uninvitedUsers={uninvitedUsers} />
      </div>

      {/* Attendee List */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-6 py-3">
          <h2 className="text-sm font-semibold text-foreground">Invite List</h2>
        </div>
        {event.attendees.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No attendees yet. Add some to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Checked In
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {event.attendees.map((a, idx) => {
                const statusConfig = {
                  INVITED: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Invited" },
                  CONFIRMED: { bg: "bg-green-500/10", text: "text-green-400", label: "Confirmed" },
                  DECLINED: { bg: "bg-red-500/10", text: "text-red-400", label: "Declined" },
                };
                const status = statusConfig[a.status as keyof typeof statusConfig];
                const checkin = a.userId ? checkinsByUserId.get(a.userId) : null;

                return (
                  <tr
                    key={a.id}
                    className={`transition-colors hover:bg-muted/20 ${idx < event.attendees.length - 1 ? "border-b border-border/50" : ""}`}
                  >
                    <td className="px-6 py-3">
                      <span className="font-medium text-foreground">
                        {a.user?.name ?? a.externalName ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {a.user?.email ?? a.externalEmail ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-muted-foreground">
                        {a.userId ? "Internal" : "External"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                        {a.respondedAt ? (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Responded {a.respondedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {checkin ? (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{checkin.checkInAt.toLocaleString()}</span>
                          {checkin.withinGeofence === true && (
                            <span className="ml-1 text-green-400 text-xs">✓ Verified</span>
                          )}
                        </div>
                      ) : (
                        <form action={manualCheckInAction} className="inline">
                          <input type="hidden" name="eventId" value={id} />
                          <input type="hidden" name="attendeeId" value={a.id} />
                          <button
                            type="submit"
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                          >
                            Check in
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <form action={removeInvite}>
                        <input type="hidden" name="attendeeId" value={a.id} />
                        <input type="hidden" name="eventId" value={id} />
                        <button
                          type="submit"
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Walk-in Check-in Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Check In Walk-in Guest
        </h2>
        <WalkInCheckInForm eventId={id} />
      </div>
    </div>
  );
}
