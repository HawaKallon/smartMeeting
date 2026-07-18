"use server";

import { revalidatePath } from "next/cache";
import { hashRsvpToken, validRsvpToken } from "@/lib/rsvp";
import { prisma } from "@/lib/prisma";

export async function updateGuestActionItemStatus(formData: FormData) {
  const token = formData.get("token") as string;
  const itemId = formData.get("itemId") as string;
  const status = formData.get("status") as string;

  // Validate token & status
  if (!validRsvpToken(token) || !["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
    return;
  }

  // Verify attendee can update this item
  const attendee = await prisma.eventAttendee.findFirst({
    where: { rsvpTokenHash: hashRsvpToken(token) },
    select: {
      id: true,
      externalName: true,
      externalEmail: true,
      user: { select: { email: true, name: true } },
      event: {
        select: {
          minutes: {
            select: {
              actionItems: {
                where: { id: itemId },
                select: { id: true, ownerName: true },
              },
            },
          },
        },
      },
    },
  });

  if (!attendee?.event.minutes?.actionItems[0]) return;

  const item = attendee.event.minutes.actionItems[0];

  // Verify attendee is the owner
  const attendeeName =
    attendee.user?.name ||
    attendee.user?.email ||
    attendee.externalName ||
    attendee.externalEmail;

  if (!attendeeName || item.ownerName?.toLowerCase() !== attendeeName.toLowerCase()) {
    return;
  }

  // Update status
  await prisma.actionItem.update({
    where: { id: itemId },
    data: { status: status as "TODO" | "IN_PROGRESS" | "DONE" },
  });

  revalidatePath(`/guest/${token}/action-items`);
}
