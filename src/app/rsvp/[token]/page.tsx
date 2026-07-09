import type { Metadata } from "next";
import Image from "next/image";
import {
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashRsvpToken, validRsvpToken } from "@/lib/rsvp";
import { RsvpResponseForm } from "./RsvpResponseForm";
import { SierraLeoneFlag } from "@/components/SierraLeoneFlag";

export const metadata: Metadata = {
  title: "Respond to Meeting Invitation",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ response?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const suggestedStatus =
    query.response === "CONFIRMED" || query.response === "DECLINED"
      ? query.response
      : undefined;

  const invitations = validRsvpToken(token)
    ? await prisma.eventAttendee.findMany({
        where: { rsvpTokenHash: hashRsvpToken(token) },
        orderBy: { event: { startAt: "asc" } },
        select: {
          status: true,
          externalName: true,
          user: { select: { name: true, email: true } },
          event: {
            select: {
              title: true,
              description: true,
              startAt: true,
              endAt: true,
              venueName: true,
              room: { select: { name: true, location: true } },
              organizer: { select: { name: true, email: true } },
              ministry: { select: { name: true } },
            },
          },
        },
      })
    : [];

  if (invitations.length === 0) {
    return (
      <Unavailable message="This invitation link is invalid or is no longer available." />
    );
  }

  const first = invitations[0];
  const event = first.event;
  const finalEnd = invitations.reduce(
    (latest, invitation) =>
      invitation.event.endAt > latest ? invitation.event.endAt : latest,
    event.endAt,
  );
  const closed = finalEnd <= new Date();
  const recipientName =
    first.user?.name ?? first.externalName ?? first.user?.email ?? "Invitee";
  const location = event.room
    ? `${event.room.name}${event.room.location ? `, ${event.room.location}` : ""}`
    : (event.venueName ?? "To be confirmed");
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      timeZone: "Africa/Freetown",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-GB", {
      timeZone: "Africa/Freetown",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-[#d3deef] bg-[#fafdff] shadow-[0_24px_70px_rgba(0,53,128,0.08)]">
        <header className="border-b border-[#d8e1ee] bg-[linear-gradient(135deg,#003580_0%,#0e4aa1_70%,#007236_100%)] px-6 py-7 text-white sm:px-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                Government of Sierra Leone
              </p>
              <h1 className="mt-2 text-xl font-bold leading-snug">
                {event.ministry.name}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Image
                src="/coat_of_arms.jpeg"
                alt="Sierra Leone coat of arms"
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
              />
              <SierraLeoneFlag className="h-8 w-14 border-white/20" />
            </div>
          </div>
        </header>

        <div className="space-y-7 px-6 py-8 sm:px-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007236]">
              Official Meeting Invitation
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-[#003580]">
              {event.title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Dear {recipientName}, please review the meeting details and record
              your response below.
            </p>
          </div>

          <dl className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-[#edf4fd] p-5 sm:grid-cols-2">
            <Detail
              icon={<CalendarDays className="h-4 w-4" />}
              label={invitations.length > 1 ? "First occurrence" : "Date"}
              value={formatDate(event.startAt)}
            />
            <Detail
              icon={<Clock3 className="h-4 w-4" />}
              label="Time"
              value={`${formatTime(event.startAt)}–${formatTime(event.endAt)} GMT`}
            />
            <Detail
              icon={<MapPin className="h-4 w-4" />}
              label="Location"
              value={location}
            />
            <Detail
              icon={<UserRound className="h-4 w-4" />}
              label="Organizer"
              value={event.organizer.name ?? event.organizer.email}
            />
            {invitations.length > 1 ? (
              <Detail
                icon={<CalendarDays className="h-4 w-4" />}
                label="Series"
                value={`${invitations.length} occurrences; final meeting ${formatDate(finalEnd)}`}
              />
            ) : null}
          </dl>

          {event.description ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#003580]">
                Purpose / Agenda
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {event.description}
              </p>
            </section>
          ) : null}

          {closed ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              The response period for this invitation has closed.
            </div>
          ) : (
            <RsvpResponseForm
              token={token}
              currentStatus={first.status}
              suggestedStatus={suggestedStatus}
            />
          )}

          <div className="flex gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            This page is personal to your invitation. Do not share its address
            with another person.
          </div>
        </div>
      </div>
    </main>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-emerald-700">{icon}</span>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-medium leading-5 text-slate-800">
          {value}
        </dd>
      </div>
    </div>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-slate-900">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-[#fafdff] p-8 text-center shadow-[0_24px_70px_rgba(0,53,128,0.08)]">
        <ShieldCheck className="mx-auto h-9 w-9 text-slate-400" />
        <h1 className="mt-4 text-xl font-bold text-[#003580]">
          Invitation unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <p className="mt-4 text-xs text-slate-500">
          Please contact the meeting organizer if you require assistance.
        </p>
      </div>
    </main>
  );
}
