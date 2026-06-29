import Link from "next/link";
import { requireAdminRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { createPublicEvent } from "../actions";
import { PublicEventForm } from "../PublicEventForm";

export default async function NewPublicEventPage() {
  const user = await requireAdminRole();
  const ministries = isSuperAdmin(user.role) ? await prisma.ministry.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : undefined;
  return <div className="mx-auto max-w-3xl space-y-6"><Link href="/admin/public-calendar" className="text-sm text-muted-foreground hover:text-foreground">← Public Calendar</Link><div><h1 className="text-2xl font-bold text-foreground">New public event</h1><p className="mt-1 text-sm text-muted-foreground">New events are saved as drafts until explicitly published.</p></div><div className="rounded-xl border border-border bg-card p-6"><PublicEventForm action={createPublicEvent} ministries={ministries} /></div></div>;
}
