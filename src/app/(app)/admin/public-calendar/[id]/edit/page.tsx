import { notFound } from "next/navigation";
import { requireAdminRole, assertSameMinistry } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { PublicEventForm } from "../../PublicEventForm";

export default async function EditPublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdminRole();
  const p = await params;

  const event = await prisma.event.findUnique({
    where: { id: p.id },
    include: { invitedMinistries: { select: { id: true } } },
  });

  if (!event) {
    return notFound();
  }

  assertSameMinistry(user, event.ministryId);

  const ministries = await prisma.ministry.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <BackButton href="/administrative/admin/public-calendar" label="Public Calendar" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the event details or publish/unpublish
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <PublicEventForm event={event} ministries={ministries} userMinistryId={user.ministryId} />
      </div>
    </div>
  );
}
