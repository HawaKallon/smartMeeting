"use server";

import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canManageExistingEvent } from "@/lib/eventAccess";

export async function saveReport(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const eventId = formData.get("eventId") as string;
    const content = formData.get("content") as string;

    if (!eventId || !content?.trim()) {
      return { error: "Event ID and report content are required" };
    }

    // Verify event exists and user has permission
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, ministryId: true, organizerId: true, coOrganizers: { select: { id: true } } },
    });

    if (!event || !canManageExistingEvent(user, event)) {
      return { error: "Event not found" };
    }

    // Log to audit trail
    await audit({
      actorId: user.id,
      action: "WRITE_MEETING_REPORT",
      entityType: "Event",
      entityId: eventId,
      metadata: { contentLength: content.length },
      ministryId: event.ministryId,
    });

    return { ok: true };
  } catch (err) {
    console.error("Failed to save report:", err);
    return { error: "Failed to save report" };
  }
}
