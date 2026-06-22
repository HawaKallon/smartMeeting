"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaffRole, ministryScope } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { checkInClosed } from "@/lib/checkin";

const ManualSchema = z.object({
  eventId: z.string().min(1),
  // Selected from the invitee dropdown — an EventAttendee id (registered or external).
  attendeeId: z.string().optional(),
  // Free-text "External Guest" tab — an ad-hoc name not on the invite list.
  externalName: z.string().optional(),
});

export type ActionState =
  | { ok?: true; already?: true; error?: string }
  | undefined;

export async function manualCheckIn(
  _prev: unknown,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await assertStaffRole();

    const parsed = ManualSchema.safeParse({
      eventId: formData.get("eventId"),
      attendeeId: formData.get("attendeeId") || undefined,
      externalName: formData.get("externalName") || undefined,
    });
    if (!parsed.success) return { error: "Invalid input" };
    const { eventId, attendeeId, externalName } = parsed.data;

    if (!attendeeId && !externalName) {
      return { error: "Select an invitee or enter a name" };
    }

    // Check-in closes once the meeting has ended — no late attendance, even
    // for staff manual entry.
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...ministryScope(admin),
      },
      select: { endAt: true },
    });
    if (!event) return { error: "Event not found or you don't have access." };
    if (checkInClosed(event.endAt)) {
      return { error: "This meeting has ended. Check-in is closed." };
    }

    // Resolve what we're checking in. An invitee picked from the dropdown is
    // keyed by EventAttendee id and may be a registered user or an external
    // guest; the External Guest tab supplies an ad-hoc name instead.
    let userId: string | null = null;
    let guestName: string | null = externalName ?? null;
    let guestEmail: string | null = null;

    if (attendeeId) {
      const invite = await prisma.eventAttendee.findFirst({
        where: { id: attendeeId, eventId },
      });
      if (!invite) {
        return { error: "This invitee is not on the list for this event." };
      }
      userId = invite.userId;
      guestName = invite.userId ? null : invite.externalName;
      guestEmail = invite.userId ? null : invite.externalEmail;
    }

    // Normalize the typed/looked-up name so whitespace differences don't slip
    // past the duplicate check below.
    guestName = guestName?.trim() || null;

    // Avoid duplicate check-ins. Registered users are matched by userId. An
    // external guest is treated as the same person if EITHER their name or
    // their email matches an existing external attendance — so a guest checked
    // in once by name-only and once by name+email can't get two rows.
    const externalMatches = [
      guestEmail ? { externalEmail: { equals: guestEmail, mode: "insensitive" as const } } : null,
      guestName ? { externalName: { equals: guestName, mode: "insensitive" as const } } : null,
    ].filter(Boolean) as object[];
    const existing = userId
      ? await prisma.attendance.findFirst({ where: { eventId, userId } })
      : externalMatches.length
        ? await prisma.attendance.findFirst({
            where: { eventId, userId: null, OR: externalMatches },
          })
        : null;
    if (existing) {
      revalidatePath(`/events/${eventId}/attendance`);
      return { ok: true, already: true };
    }

    const attendance = await prisma.attendance.create({
      data: {
        eventId,
        userId,
        externalName: userId ? null : guestName,
        externalEmail: userId ? null : guestEmail,
        method: "MANUAL",
      },
    });

    await audit({
      actorId: admin.id,
      action: "MANUAL_CHECK_IN",
      entityType: "Attendance",
      entityId: attendance.id,
      metadata: { eventId, userId, externalName: guestName, externalEmail: guestEmail },
      ministryId: admin.ministryId,
    });

    // Revalidate all relevant pages so check-in shows everywhere.
    revalidatePath(`/events/${eventId}/attendance`);
    revalidatePath(`/events/${eventId}/attendees`);
    revalidatePath(`/events/${eventId}`);

    return { ok: true };
  } catch (err) {
    console.error("Manual check-in failed:", err);
    return { error: "Failed to check in" };
  }
}
