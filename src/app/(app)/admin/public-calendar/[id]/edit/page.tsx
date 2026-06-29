import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole, ministryScope } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { updatePublicEvent } from "../../actions";
import { PublicEventForm } from "../../PublicEventForm";

export default async function EditPublicEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminRole();
  const { id } = await params;
  const [event, ministries] = await Promise.all([
    prisma.publicEvent.findFirst({ where: { id, ...ministryScope(user) } }),
    isSuperAdmin(user.role) ? prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : undefined,
  ]);
  if (!event) notFound();
  const action = updatePublicEvent.bind(null, event.id);
  return <div className="mx-auto max-w-3xl space-y-6"><Link href="/admin/public-calendar" className="text-sm text-muted-foreground hover:text-foreground">← Public Calendar</Link><div><h1 className="text-2xl font-bold text-foreground">Edit public event</h1><p className="mt-1 text-sm text-muted-foreground">Status: {event.status === "PUBLISHED" ? "Published" : "Draft"}</p></div><div className="rounded-xl border border-border bg-card p-6"><PublicEventForm action={action} event={event} ministries={ministries} /></div></div>;
}
