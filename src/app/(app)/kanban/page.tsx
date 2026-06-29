import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { canManageEvents } from "@/lib/roles";
import { KanbanBoard } from "./KanbanBoard";
import { OwnerFilter } from "./OwnerFilter";

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await requireUser();
  const { owner: ownerFilter } = await searchParams;

  const isStaff = canManageEvents(user.role);

  const whereOwner = isStaff
    ? ownerFilter && ownerFilter !== "all" ? { ownerId: ownerFilter } : {}
    : { ownerId: user.id };

  const rawItems = await prisma.actionItem.findMany({
    where: whereOwner,
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    include: {
      owner: { select: { id: true, name: true, email: true } },
      minutes: {
        select: {
          event: { select: { title: true } },
        },
      },
    },
  });

  const items = rawItems.map((i) => ({
    id: i.id,
    title: i.title,
    status: i.status as "TODO" | "IN_PROGRESS" | "DONE",
    dueDate: i.dueDate ? i.dueDate.toISOString().slice(0, 10) : null,
    eventTitle: i.minutes.event.title,
    ownerName: i.owner?.name ?? i.owner?.email ?? null,
  }));

  const users = isStaff
    ? await prisma.user.findMany({
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Task board</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Action Items</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totals.todo} to do · {totals.inProgress} in progress · {totals.done} done
          </p>
        </div>

        {isStaff && users.length > 0 && (
          <OwnerFilter users={users} currentFilter={ownerFilter ?? "all"} />
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.75rem] border border-border bg-card px-8 py-16 text-center shadow-[0_16px_40px_rgba(15,35,63,0.07)]">
          <p className="text-sm text-muted-foreground">No action items yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Action items are created from meeting minutes.
          </p>
        </div>
      ) : (
        <KanbanBoard
          items={items}
          canMoveAny={isStaff}
          currentUserId={user.id}
          ownerFilter={ownerFilter ?? "all"}
        />
      )}
    </div>
  );
}
