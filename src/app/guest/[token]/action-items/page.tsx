import { notFound } from "next/navigation";
import { hashRsvpToken, validRsvpToken } from "@/lib/rsvp";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { updateGuestActionItemStatus } from "./actions";

export default async function GuestActionItemsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!validRsvpToken(token)) notFound();

  const attendee = await prisma.eventAttendee.findFirst({
    where: { rsvpTokenHash: hashRsvpToken(token) },
    select: {
      id: true,
      status: true,
      externalName: true,
      externalEmail: true,
      user: { select: { email: true, name: true } },
      event: {
        select: {
          id: true,
          title: true,
          minutes: {
            select: {
              id: true,
              status: true,
              actionItems: true,
            },
          },
        },
      },
    },
  });

  if (!attendee || !attendee.event.minutes) notFound();

  // Get the name/email to match against action items
  const attendeeName =
    attendee.user?.name ||
    attendee.user?.email ||
    attendee.externalName ||
    attendee.externalEmail;

  // Filter action items assigned to this attendee
  const assignedItems = attendee.event.minutes.actionItems.filter(
    (item) =>
      item.ownerName?.toLowerCase() === attendeeName?.toLowerCase()
  );

  const statusIcons = {
    TODO: <AlertCircle className="h-4 w-4" />,
    IN_PROGRESS: <Clock className="h-4 w-4" />,
    DONE: <CheckCircle2 className="h-4 w-4" />,
  };

  const statusColors = {
    TODO: "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
    IN_PROGRESS: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
    DONE: "bg-green-500/10 text-green-400 hover:bg-green-500/20",
  };

  const statusLabels = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/guest/${token}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Event
      </Link>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-foreground">Your Action Items</h2>

        {assignedItems.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No action items assigned to you.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {assignedItems.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-secondary/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    {item.dueDate && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <form
                  action={updateGuestActionItemStatus}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="token" value={token} />

                  {(["TODO", "IN_PROGRESS", "DONE"] as const).map((status) => (
                    <button
                      key={status}
                      type="submit"
                      name="status"
                      value={status}
                      className={`inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                        item.status === status
                          ? statusColors[status]
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {statusIcons[status]}
                      {statusLabels[status]}
                    </button>
                  ))}
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
