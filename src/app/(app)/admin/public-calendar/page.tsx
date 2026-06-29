import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { requireAdminRole, ministryScope } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { PublicEventActions } from "./PublicEventActions";

export default async function PublicCalendarAdminPage() {
  const user = await requireAdminRole();
  const events = await prisma.publicEvent.findMany({
    where: ministryScope(user),
    orderBy: [{ startAt: "desc" }],
    include: { ministry: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Public Calendar</h1><p className="mt-1 text-sm text-muted-foreground">Create and publish events for the public website.</p></div>
        <div className="flex gap-2">
          <Link target="_blank" href="/public-calendar" className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm text-muted-foreground hover:bg-muted"><ExternalLink className="h-4 w-4" /> View public calendar</Link>
          <Link href="/admin/public-calendar/new" className="flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background"><Plus className="h-4 w-4" /> New event</Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Event</th><th className="px-5 py-3">Ministry</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4"><Link href={`/admin/public-calendar/${event.id}/edit`} className="font-medium text-foreground hover:text-blue-400">{event.title}</Link>{event.category && <p className="mt-1 text-xs text-muted-foreground">{event.category}</p>}</td>
                <td className="px-5 py-4 text-muted-foreground">{event.ministry.name}</td>
                <td className="px-5 py-4 text-muted-foreground">{event.startAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Freetown" })}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${event.status === "PUBLISHED" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>{event.status === "PUBLISHED" ? "Published" : "Draft"}</span></td>
                <td className="px-5 py-4"><div className="flex items-center justify-end gap-2"><Link href={`/admin/public-calendar/${event.id}/edit`} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">Edit</Link><PublicEventActions id={event.id} status={event.status} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <div className="px-6 py-14 text-center text-sm text-muted-foreground">No public events have been created.</div>}
      </div>
    </div>
  );
}
