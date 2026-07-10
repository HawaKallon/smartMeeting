import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { canManageEvents } from "@/lib/roles";
import { ActionItemsView } from "./ActionItemsView";
import { ListTodo } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await requireUser();
  const { owner: ownerFilter } = await searchParams;

  const isStaff = canManageEvents(user.systemRole);

  const where: Prisma.ActionItemWhereInput = isStaff
    ? {
        minutes: { event: { ministryId: user.ministryId ?? undefined } },
        ...(ownerFilter && ownerFilter !== "all" ? { ownerId: ownerFilter } : {}),
      }
    : { ownerId: user.id };

  const rawItems = await prisma.actionItem.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      point: true,
      dueDate: true,
      ownerId: true,
      ownerName: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, email: true } },
      minutes: {
        select: {
          eventId: true,
          event: { select: { title: true } },
        },
      },
    },
  });

  const items = rawItems.map((i) => ({
    id: i.id,
    title: i.title,
    status: i.status as "TODO" | "IN_PROGRESS" | "DONE",
    point: i.point as "ACTION_POINT" | "AGREED",
    dueDate: i.dueDate ? i.dueDate.toISOString() : null,
    eventTitle: i.minutes.event.title,
    eventId: i.minutes.eventId,
    ownerId: i.ownerId,
    ownerName: i.owner?.name ?? i.ownerName ?? i.owner?.email ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }));

  const users = isStaff
    ? await prisma.user.findMany({
        where: {
          ministryId: user.ministryId ?? undefined,
          systemRole: { not: "SUPER_ADMIN" },
        },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      })
    : [];

  const totals = {
    todo: items.filter((i) => i.status === "TODO").length,
    inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
    done: items.filter((i) => i.status === "DONE").length,
  };

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Task board</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Action Items</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {totals.todo} to do · {totals.inProgress} in progress · {totals.done} done
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-8 py-16 text-center shadow-sm">
          <ListTodo className="mx-auto h-8 w-8 text-primary/25" />
          <p className="mt-3 text-sm text-muted-foreground">No action items yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Action items are created from meeting minutes.
          </p>
        </div>
      ) : (
        <ActionItemsView
          items={items}
          canMoveAny={isStaff}
          currentUserId={user.id}
          ownerFilter={ownerFilter ?? "all"}
          users={users}
        />
      )}
    </div>
  );
}
