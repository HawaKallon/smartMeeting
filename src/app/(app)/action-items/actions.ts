"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { notifyMeetingInviteesActionItemStatusChanged } from "@/lib/actionItemNotifications";

const Schema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

export async function changeItemStatus(formData: FormData): Promise<void> {
  const session = await assertRole(
    "MINISTER", "PERMANENT_SECRETARY", "DEPUTY_MINISTER",
    "DEPUTY_SECRETARY", "ADMIN_STAFF", "ADMIN", "SUPER_ADMIN",
  );

  const parsed = Schema.safeParse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const { itemId, status } = parsed.data;

  const item = await prisma.actionItem.findFirst({
    where: {
      id: itemId,
      minutes: { event: { ministryId: session.ministryId || undefined } },
    },
    select: {
      id: true,
      title: true,
      status: true,
      ownerId: true,
      minutes: { select: { eventId: true, event: { select: { ministryId: true } } } },
    },
  });
  if (!item) return;

  const isStaff = isSuperAdmin(session.role) || session.role === "ADMIN_STAFF" || session.role === "ADMIN";
  const isOwner = item.ownerId === session.id;
  if (!isStaff && !isOwner) return;
  if (item.status === status) return;

  await prisma.actionItem.update({ where: { id: itemId }, data: { status } });

  await audit({
    actorId: session.id,
    action: "KANBAN_MOVE",
    entityType: "ActionItem",
    entityId: itemId,
    metadata: { status },
    ministryId: session.ministryId,
  });

  await notifyMeetingInviteesActionItemStatusChanged({
    eventId: item.minutes.eventId,
    title: item.title,
    oldStatus: item.status,
    newStatus: status,
  });

  revalidatePath("/administrative/action-items");
}
