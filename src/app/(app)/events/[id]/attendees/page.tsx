import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { removeInvite } from "./actions";
import { AttendeeRow } from "./AttendeeRow";
import { AddAttendeeForm } from "./AddAttendeeForm";
import { Users, Mail, CheckCircle, Clock, XCircle } from "lucide-react";

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaffRole();

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      attendees: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!event) notFound();

  const invitedUserIds = event.attendees
    .map((a) => a.userId)
    .filter((uid): uid is string => uid !== null);

  const allUsers = await prisma.user.findMany({
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
        <BackButton href={`/events/${id}`} label={event.title} />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Attendees</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage event attendees and invitations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
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
    </div>
  );
}
