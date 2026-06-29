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
      <BackButton href="/administrative/admin" label="Admin" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Public publishing</p>
          <h1 className="mt-2 text-2xl font-bold text-[#003580]">Public Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage public events visible to all visitors
          </p>
        </div>
        <Link
          href="/administrative/admin/public-calendar/new"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002a68]"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-[1.5rem] border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-muted-foreground">No public events yet</p>
          <Link
            href="/administrative/admin/public-calendar/new"
            className="mt-4 inline-block text-sm font-semibold text-[#003580] hover:text-[#00265b]"
          >
            Create the first one →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start justify-between gap-4 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-lg truncate">{event.title}</h3>
                  {event.status === "PUBLISHED" ? (
                    <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-[#cfe5d7] bg-[#edf8f1] px-3 py-1 text-xs font-medium text-[#007236]">
                      <Globe className="h-3 w-3" />
                      Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-[#fde8a6] bg-[#fff7dd] px-3 py-1 text-xs font-medium text-[#946200]">
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
                  href={`/administrative/admin/public-calendar/${event.id}/edit`}
                  className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Link>
                <Link
                  href={`/administrative/admin/public-calendar/${event.id}/delete`}
                  className="flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
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
