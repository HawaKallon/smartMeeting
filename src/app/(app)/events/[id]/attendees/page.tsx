import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { removeInvite } from "./actions";
import { AttendeeRow } from "./AttendeeRow";
import { AddAttendeeForm } from "./AddAttendeeForm";

const STATUS_BADGE = {
  INVITED: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

const STATUS_LABEL = {
  INVITED: "Invited",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
};

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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <BackButton href={`/events/${id}`} label={event.title} />
        <h1 className="text-2xl font-bold text-foreground">Attendees</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Confirmed" value={confirmed} color="text-green-600" />
        <Stat label="Pending" value={pending} color="text-yellow-600" />
        <Stat label="Declined" value={declined} color="text-red-600" />
      </div>

      {/* Attendee table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-medium text-foreground/80">Invite List</h2>
        </div>
        {event.attendees.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No attendees yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-muted-foreground/60">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Update</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {event.attendees.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 font-medium text-foreground">
                    {a.user?.name ?? a.externalName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.user?.email ?? a.externalEmail ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.userId ? "Staff" : "External"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <AttendeeRow attendeeId={a.id} eventId={id} currentStatus={a.status} removeAction={removeInvite} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add attendee form */}
      <AddAttendeeForm eventId={id} uninvitedUsers={uninvitedUsers} />
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
