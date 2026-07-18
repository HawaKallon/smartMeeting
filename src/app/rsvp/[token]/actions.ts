"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashRsvpToken, validRsvpToken } from "@/lib/rsvp";

export type PublicRsvpState = {
  ok?: true;
  status?: "CONFIRMED" | "DECLINED";
  error?: string;
};

const RsvpSchema = z.object({
  token: z.string().min(1),
  status: z.enum(["CONFIRMED", "DECLINED"]),
});

export async function respondToInvitation(
  _previous: PublicRsvpState,
  formData: FormData,
): Promise<PublicRsvpState> {
  const parsed = RsvpSchema.safeParse({
    token: formData.get("token"),
    status: formData.get("status"),
  });
  if (!parsed.success || !validRsvpToken(parsed.data.token)) {
    return { error: "This invitation link is invalid." };
  }

  const tokenHash = hashRsvpToken(parsed.data.token);
  const invitations = await prisma.eventAttendee.findMany({
    where: { rsvpTokenHash: tokenHash },
    select: {
      id: true,
      eventId: true,
      userId: true,
      event: { select: { endAt: true, ministryId: true } },
    },
  });

  if (invitations.length === 0) {
    return { error: "This invitation is no longer available." };
  }

  const finalEnd = invitations.reduce(
    (latest, invitation) => invitation.event.endAt > latest ? invitation.event.endAt : latest,
    invitations[0].event.endAt,
  );
  if (finalEnd <= new Date()) {
    return { error: "The response period for this invitation has closed." };
  }

  const respondedAt = new Date();
  await prisma.eventAttendee.updateMany({
    where: { rsvpTokenHash: tokenHash },
    data: { status: parsed.data.status, respondedAt },
  });

  await audit({
    actorId: invitations[0].userId,
    action: "EMAIL_RSVP",
    entityType: "EventAttendee",
    entityId: invitations[0].id,
    metadata: {
      eventId: invitations[0].eventId,
      status: parsed.data.status,
      occurrences: invitations.length,
      channel: "secure_email_link",
    },
    ministryId: invitations[0].event.ministryId,
  });

  for (const invitation of invitations) {
    revalidatePath(`/administrative/events/${invitation.eventId}`);
    revalidatePath(`/administrative/events/${invitation.eventId}/attendees`);
  }

  return { ok: true, status: parsed.data.status };
}
