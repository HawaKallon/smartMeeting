import Link from "next/link";
import { requireAdminRole, ministryScope } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { Plus, Edit2, Trash2, Globe, Lock } from "lucide-react";

export default async function AdminPublicCalendarPage() {
  const user = await requireAdminRole();

  const events = await prisma.publicEvent.findMany({
    where: ministryScope(user),
    orderBy: { startAt: "desc" },
    include: { ministry: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Admin" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Public Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage public events visible to all visitors
          </p>
        </div>
        <Link
          href="/admin/public-calendar/new"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No public events yet</p>
          <Link
            href="/admin/public-calendar/new"
            className="mt-4 inline-block text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Create the first one →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-lg truncate">{event.title}</h3>
                  {event.status === "PUBLISHED" ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 whitespace-nowrap">
                      <Globe className="h-3 w-3" />
                      Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 whitespace-nowrap">
                      <Lock className="h-3 w-3" />
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {event.startAt.toLocaleDateString("default", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {event.startAt.toLocaleTimeString("default", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {event.ministry && (
                  <div className="mt-1 text-xs text-muted-foreground">{event.ministry.name}</div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/admin/public-calendar/${event.id}/edit`}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Link>
                <Link
                  href={`/admin/public-calendar/${event.id}/delete`}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
