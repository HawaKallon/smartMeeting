import { notFound } from "next/navigation";
import { isMinutesArchived } from "@/lib/minutesPolicy";
import { hashRsvpToken, validRsvpToken } from "@/lib/rsvp";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default async function GuestMinutesPage({
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
      event: {
        select: {
          id: true,
          title: true,
          minutes: {
            select: {
              id: true,
              status: true,
              body: true,
              summary: true,
              publishedAt: true,
              actionItems: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  dueDate: true,
                  ownerName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attendee) notFound();

  const { event } = attendee;
  const { minutes } = event;

  // Access control: only confirmed/invited attendees can view published minutes
  if (!minutes || minutes.status !== "PUBLISHED") notFound();
  if (attendee.status === "DECLINED") notFound();
  if (isMinutesArchived(event.startAt)) notFound();

  const statusIcons = {
    TODO: <AlertCircle className="h-4 w-4" />,
    IN_PROGRESS: <Clock className="h-4 w-4" />,
    DONE: <CheckCircle2 className="h-4 w-4" />,
  };

  const statusColors = {
    TODO: "bg-yellow-500/10 text-yellow-400",
    IN_PROGRESS: "bg-blue-500/10 text-blue-400",
    DONE: "bg-green-500/10 text-green-400",
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Meeting Minutes</h2>
          {minutes.publishedAt && (
            <p className="text-sm text-muted-foreground">
              Published {minutes.publishedAt.toLocaleDateString()}
            </p>
          )}
        </div>

        {minutes.summary && (
          <div className="mt-6 rounded-lg bg-secondary/20 p-4">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
              Summary
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {minutes.summary}
            </p>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
            Full Minutes
          </h3>
          <div className="mt-3 rounded-lg bg-secondary/30 p-4">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {minutes.body || "No minutes recorded."}
            </p>
          </div>
        </div>

        {minutes.actionItems.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
              Action Items
            </h3>
            <ul className="mt-3 space-y-3">
              {minutes.actionItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-secondary/10 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.ownerName && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Assigned to: {item.ownerName}
                        </p>
                      )}
                      {item.dueDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due: {item.dueDate.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex shrink-0 items-center gap-2 rounded px-2 py-1 text-xs font-medium ${
                        statusColors[item.status as keyof typeof statusColors]
                      }`}
                    >
                      {statusIcons[item.status as keyof typeof statusIcons]}
                      {statusLabels[item.status as keyof typeof statusLabels]}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
