import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, canManageEvents, canViewMinistrySchedule } from "@/lib/roles";

export default async function Dashboard() {
  const user = await requireUser();
  const isAdmin = canManageEvents(user.role);

  const now = new Date();
  const upcoming = await prisma.event.findMany({
    where: canViewMinistrySchedule(user.role)
      ? { startAt: { gte: now } }
      : { startAt: { gte: now }, organizerId: user.id },
    orderBy: { startAt: "asc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome, {user.name ?? user.email}
        </h1>
        <p className="text-sm text-gray-500">
          Signed in as {ROLE_LABELS[user.role]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card href="/calendar" title="Calendar" desc="View all scheduled meetings & events" />
        {isAdmin ? (
          <>
            <Card href="/events/new" title="New Event" desc="Create a meeting or conference" />
            <Card href="/attendance" title="Attendance" desc="Reports & manual check-in" />
          </>
        ) : null}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming events.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/events/${e.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {e.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {e.startAt.toLocaleString()} · {e.venueName ?? "No venue"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-gray-400"
    >
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </Link>
  );
}
