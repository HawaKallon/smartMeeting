import { requireUser, ministryScope } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { canManageUsers } from "@/lib/permissions";
import { Inbox, Users, Calendar, Home } from "lucide-react";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;

  if (!q || q.trim().length === 0) {
    return (
      <div className="space-y-6">
        <BackButton href="/administrative" label="Dashboard" />
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-primary/25" />
          <p className="mt-3 text-sm text-muted-foreground">Enter a search query to get started</p>
        </div>
      </div>
    );
  }

  const query = q.trim().toLowerCase();
  const scope = ministryScope(user);

  // Search across Events, Minutes, Rooms, and (for admins) Users
  const [events, minutes, rooms, users] = await Promise.all([
    prisma.event.findMany({
      where: {
        ...scope,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        organizer: { select: { name: true, email: true } },
      },
      take: 20,
    }),
    prisma.minutes.findMany({
      where: {
        ...scope,
        event: { ministryId: scope.ministryId },
        OR: [
          { body: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        eventId: true,
        body: true,
        summary: true,
        event: { select: { title: true } },
      },
      take: 20,
    }),
    prisma.room.findMany({
      where: {
        ...scope,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        location: true,
        capacity: true,
      },
      take: 20,
    }),
    canManageUsers(user)
      ? prisma.user.findMany({
          where: {
            ...scope,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
          take: 20,
        })
      : [],
  ]);

  const hasResults = events.length > 0 || minutes.length > 0 || rooms.length > 0 || users.length > 0;

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Global search</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Search Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Results for &quot;<span className="font-semibold">{query}</span>&quot;
        </p>
      </div>

      {!hasResults ? (
        <div className="rounded-[1.75rem] border border-border bg-card p-12 text-center shadow-[0_16px_40px_rgba(15,35,63,0.07)]">
          <Inbox className="mx-auto h-8 w-8 text-primary/25" />
          <p className="mt-3 text-sm text-muted-foreground">No results found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Events */}
          {events.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events ({events.length})
              </h2>
              <div className="space-y-2">
                {events.map((e) => (
                  <Link
                    key={e.id}
                    href={`/administrative/events/${e.id}`}
                    className="block rounded-[1.35rem] border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/30"
                  >
                    <p className="font-medium text-foreground">{e.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {e.startAt.toLocaleDateString("en-GB")} •{" "}
                        {e.organizer.name || e.organizer.email}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Minutes */}
          {minutes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Meeting Minutes ({minutes.length})
              </h2>
              <div className="space-y-2">
                {minutes.map((m) => (
                  <Link
                    key={m.id}
                    href={`/administrative/events/${m.eventId}/minutes`}
                    className="block rounded-[1.35rem] border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/30"
                  >
                    <p className="font-medium text-foreground">{m.event.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {m.summary || m.body}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Rooms */}
          {rooms.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Home className="h-5 w-5" />
                Rooms ({rooms.length})
              </h2>
              <div className="space-y-2">
                {rooms.map((r) => (
                  <Link
                    key={r.id}
                    href={`/administrative/rooms/${r.id}`}
                    className="block rounded-[1.35rem] border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/30"
                  >
                    <p className="font-medium text-foreground">{r.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {r.location} • Capacity: {r.capacity}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users (admin only) */}
          {users.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5" />
                People ({users.length})
              </h2>
              <div className="space-y-2">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/administrative/admin/users`}
                    className="block rounded-[1.35rem] border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/30"
                  >
                    <p className="font-medium text-foreground">{u.name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
