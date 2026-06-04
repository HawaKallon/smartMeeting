"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaffRole, assertRole } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";

export type ActionState = { error?: string; ok?: true } | undefined;

// ── Invite a registered ministry user ───────────────────────────────────────

const InviteUserSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1, "Select a user"),
});

export async function inviteUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await assertStaffRole();

  const parsed = InviteUserSchema.safeParse({
    eventId: formData.get("eventId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId, userId } = parsed.data;

  const [event, user] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, startAt: true, venueName: true, organizer: { select: { name: true, email: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ]);
  if (!event) return { error: "Event not found." };
  if (!user) return { error: "User not found." };

  const existing = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (existing) return { error: "This user is already invited." };

  const attendee = await prisma.eventAttendee.create({
    data: { eventId, userId, status: "INVITED" },
  });

  await audit({
    actorId: staff.id,
    action: "INVITE_ATTENDEE",
    entityType: "EventAttendee",
    entityId: attendee.id,
    metadata: { eventId, userId },
  });

  // Send invite email if user has an email address.
  await sendInviteEmail({
    to: user.email,
    toName: user.name ?? user.email,
    eventTitle: event.title,
    startAt: event.startAt,
    venueName: event.venueName,
    organizerName: event.organizer.name ?? event.organizer.email,
  }).catch((err) => console.error("[email] invite failed:", err));

  revalidatePath(`/events/${eventId}/attendees`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// ── Invite an external guest ─────────────────────────────────────────────────

const InviteExternalSchema = z.object({
  eventId: z.string().min(1),
  externalName: z.string().min(1, "Name is required"),
  externalEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export async function inviteExternal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await assertStaffRole();

  const parsed = InviteExternalSchema.safeParse({
    eventId: formData.get("eventId"),
    externalName: formData.get("externalName"),
    externalEmail: formData.get("externalEmail") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId, externalName, externalEmail } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, startAt: true, venueName: true, organizer: { select: { name: true, email: true } } },
  });
  if (!event) return { error: "Event not found." };

  const attendee = await prisma.eventAttendee.create({
    data: {
      eventId,
      externalName,
      externalEmail: externalEmail || null,
      status: "INVITED",
    },
  });

  await audit({
    actorId: staff.id,
    action: "INVITE_EXTERNAL",
    entityType: "EventAttendee",
    entityId: attendee.id,
    metadata: { eventId, externalName, externalEmail },
  });

  if (externalEmail) {
    await sendInviteEmail({
      to: externalEmail,
      toName: externalName,
      eventTitle: event.title,
      startAt: event.startAt,
      venueName: event.venueName,
      organizerName: event.organizer.name ?? event.organizer.email,
    }).catch((err) => console.error("[email] invite failed:", err));
  }

  revalidatePath(`/events/${eventId}/attendees`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// ── Remove an invite ─────────────────────────────────────────────────────────

export async function removeInvite(formData: FormData): Promise<void> {
  const staff = await assertStaffRole();

  const attendeeId = String(formData.get("attendeeId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!attendeeId || !eventId) return;

  const attendee = await prisma.eventAttendee.findUnique({ where: { id: attendeeId } });
  if (!attendee || attendee.eventId !== eventId) return;

  await prisma.eventAttendee.delete({ where: { id: attendeeId } });

  await audit({
    actorId: staff.id,
    action: "REMOVE_INVITE",
    entityType: "EventAttendee",
    entityId: attendeeId,
    metadata: { eventId },
  });

  revalidatePath(`/events/${eventId}/attendees`);
  revalidatePath(`/events/${eventId}`);
}

// ── Staff manually updates an attendee's RSVP status ────────────────────────

const UpdateStatusSchema = z.object({
  attendeeId: z.string().min(1),
  eventId: z.string().min(1),
  status: z.enum(["INVITED", "CONFIRMED", "DECLINED"]),
});

export async function updateAttendeeStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await assertStaffRole();

  const parsed = UpdateStatusSchema.safeParse({
    attendeeId: formData.get("attendeeId"),
    eventId: formData.get("eventId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { attendeeId, eventId, status } = parsed.data;

  const attendee = await prisma.eventAttendee.findUnique({ where: { id: attendeeId } });
  if (!attendee || attendee.eventId !== eventId) return { error: "Attendee not found." };

  await prisma.eventAttendee.update({ where: { id: attendeeId }, data: { status } });

  await audit({
    actorId: staff.id,
    action: "UPDATE_ATTENDEE_STATUS",
    entityType: "EventAttendee",
    entityId: attendeeId,
    metadata: { eventId, status },
  });

  revalidatePath(`/events/${eventId}/attendees`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// ── Logged-in user RSVPs to their own invitation ─────────────────────────────

const SelfRsvpSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["CONFIRMED", "DECLINED"]),
});

export async function selfRsvp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Any authenticated user can respond to their own invite.
  const session = await assertRole(
    "MINISTER",
    "PERMANENT_SECRETARY",
    "DEPUTY_MINISTER",
    "DEPUTY_SECRETARY",
    "ADMIN_STAFF",
    "ADMIN",
  );

  const parsed = SelfRsvpSchema.safeParse({
    eventId: formData.get("eventId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId, status } = parsed.data;

  const attendee = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId: session.id } },
  });
  if (!attendee) return { error: "You do not have an invitation for this event." };

  await prisma.eventAttendee.update({ where: { id: attendee.id }, data: { status } });

  await audit({
    actorId: session.id,
    action: "SELF_RSVP",
    entityType: "EventAttendee",
    entityId: attendee.id,
    metadata: { eventId, status },
  });

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}
