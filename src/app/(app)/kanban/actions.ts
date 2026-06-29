"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/guard";
import { audit } from "@/lib/audit";
import type { MinistryRole } from "@/generated/prisma/enums";

const Schema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

export async function changeItemStatus(formData: FormData): Promise<void> {
  // Any authenticated user can update items they own; staff can update any item.
  const session = await assertRole(
    "MINISTER", "PERMANENT_SECRETARY", "DEPUTY_MINISTER",
    "DEPUTY_SECRETARY", "ADMIN_STAFF", "ADMIN",
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
    select: { id: true, ownerId: true, minutesId: true, minutes: { select: { event: { select: { ministryId: true } } } } },
  });
  if (!item) return;

  const isStaff = session.role === "ADMIN_STAFF" || session.role === "ADMIN";
  const isOwner = item.ownerId === session.id;
  if (!isStaff && !isOwner) return; // non-staff can only move their own cards

  await prisma.actionItem.update({ where: { id: itemId }, data: { status } });

  await audit({
    actorId: session.id,
    action: "KANBAN_MOVE",
    entityType: "ActionItem",
    entityId: itemId,
    metadata: { status },
    ministryId: session.ministryId,
  });

  revalidatePath("/administrative/kanban");
}
