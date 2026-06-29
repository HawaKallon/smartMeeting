"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaffRole, assertRole, ministryScope, assertSameMinistry } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { describeRecurrence } from "@/lib/recurrence";
import { createRsvpToken, rsvpUrl } from "@/lib/rsvp";
import type { EventAttendee, Prisma } from "@/generated/prisma/client";

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
    prisma.event.findFirst({
      where: { id: eventId, ...ministryScope(staff) } as Prisma.EventWhereInput,
      select: {
        title: true,
        description: true,
        type: true,
        classification: true,
        startAt: true,
        endAt: true,
        venueName: true,
        seriesId: true,
        series: true,
        room: { select: { name: true } },
        ministry: { select: { name: true } },
        organizer: { select: { name: true, email: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, ministryId: true } }),
  ]);
  if (!event) return { error: "Event not found or you don't have access." };
  if (!user) return { error: "User not found." };

  // Ensure invited user is from the same ministry
  assertSameMinistry(staff, user.ministryId);

  const targetEvents = event.seriesId
    ? await prisma.event.findMany({
        where: { seriesId: event.seriesId, endAt: { gt: new Date() } },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          venueName: true,
          room: { select: { name: true } },
        },
        orderBy: { startAt: "asc" },
      })
    : [{
        id: eventId,
        startAt: event.startAt,
        endAt: event.endAt,
        venueName: event.venueName,
        room: event.room,
      }];
  const targetEventIds = targetEvents.length ? targetEvents.map((target) => target.id) : [eventId];
  const emailEvent = targetEvents[0] ?? event;

  const existing = await prisma.eventAttendee.findFirst({
    where: { eventId: { in: targetEventIds }, userId },
  });
  if (existing) return { error: "This user is already invited." };

  const { token, tokenHash } = createRsvpToken();
  const attendee = await prisma.$transaction(async (tx) => {
    let first: EventAttendee | null = null;
    for (const targetId of targetEventIds) {
      const created = await tx.eventAttendee.create({
        data: { eventId: targetId, userId, status: "INVITED", rsvpTokenHash: tokenHash },
      });
      first ??= created;
    }
    return first!;
  });

  await audit({
    actorId: staff.id,
    action: "INVITE_ATTENDEE",
    entityType: "EventAttendee",
    entityId: attendee.id,
    metadata: { eventId, userId },
    ministryId: staff.ministryId,
  });

  // Send invite email if user has an email address.
  await sendInviteEmail({
    to: user.email,
    toName: user.name ?? user.email,
    eventTitle: event.title,
    eventDescription: event.description,
    eventType: event.type,
    classification: event.classification,
    startAt: emailEvent.startAt,
    endAt: emailEvent.endAt,
    venueName: emailEvent.venueName,
    roomName: emailEvent.room?.name ?? null,
    organizerName: event.organizer.name ?? event.organizer.email,
    organizerEmail: event.organizer.email,
    ministryName: event.ministry.name,
    recurrenceText: event.series ? describeRecurrence(event.series) : null,
    acceptUrl: rsvpUrl(token, "CONFIRMED"),
    declineUrl: rsvpUrl(token, "DECLINED"),
  }).catch((err) => console.error("[email] invite failed:", err));

  for (const targetId of targetEventIds) {
    revalidatePath(`/administrative/events/${targetId}/attendees`);
    revalidatePath(`/administrative/events/${targetId}`);
  }
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

  const event = await prisma.event.findFirst({
    where: { id: eventId, ...ministryScope(staff) } as Prisma.EventWhereInput,
    select: {
      title: true,
      description: true,
      type: true,
      classification: true,
      startAt: true,
      endAt: true,
      venueName: true,
      seriesId: true,
      series: true,
      room: { select: { name: true } },
      ministry: { select: { name: true } },
      organizer: { select: { name: true, email: true } },
    },
  });
  if (!event) return { error: "Event not found or you don't have access." };

  const targetEvents = event.seriesId
    ? await prisma.event.findMany({
        where: { seriesId: event.seriesId, endAt: { gt: new Date() } },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          venueName: true,
          room: { select: { name: true } },
        },
        orderBy: { startAt: "asc" },
      })
    : [{
        id: eventId,
        startAt: event.startAt,
        endAt: event.endAt,
        venueName: event.venueName,
        room: event.room,
      }];
  const targetEventIds = targetEvents.length ? targetEvents.map((target) => target.id) : [eventId];
  const emailEvent = targetEvents[0] ?? event;

  if (externalEmail) {
    const duplicate = await prisma.eventAttendee.findFirst({
      where: {
        eventId: { in: targetEventIds },
        externalEmail: { equals: externalEmail, mode: "insensitive" },
      },
    });
    if (duplicate) return { error: "This email address is already invited." };
  }

  const credentials = externalEmail ? createRsvpToken() : null;
  const attendee = await prisma.$transaction(async (tx) => {
    let first: EventAttendee | null = null;
    for (const targetId of targetEventIds) {
      const created = await tx.eventAttendee.create({
        data: {
          eventId: targetId,
          externalName,
          externalEmail: externalEmail || null,
          status: "INVITED",
          rsvpTokenHash: credentials?.tokenHash ?? null,
        },
      });
      first ??= created;
    }
    return first!;
  });

  await audit({
    actorId: staff.id,
    action: "INVITE_EXTERNAL",
    entityType: "EventAttendee",
    entityId: attendee.id,
    metadata: { eventId, externalName, externalEmail },
    ministryId: staff.ministryId,
  });

  if (externalEmail) {
    await sendInviteEmail({
      to: externalEmail,
      toName: externalName,
      eventTitle: event.title,
      eventDescription: event.description,
      eventType: event.type,
      classification: event.classification,
      startAt: emailEvent.startAt,
      endAt: emailEvent.endAt,
      venueName: emailEvent.venueName,
      roomName: emailEvent.room?.name ?? null,
      organizerName: event.organizer.name ?? event.organizer.email,
      organizerEmail: event.organizer.email,
      ministryName: event.ministry.name,
      recurrenceText: event.series ? describeRecurrence(event.series) : null,
      acceptUrl: rsvpUrl(credentials!.token, "CONFIRMED"),
      declineUrl: rsvpUrl(credentials!.token, "DECLINED"),
    }).catch((err) => console.error("[email] invite failed:", err));
  }

  for (const targetId of targetEventIds) {
    revalidatePath(`/administrative/events/${targetId}/attendees`);
    revalidatePath(`/administrative/events/${targetId}`);
  }
  return { ok: true };
}

// ── Remove an invite ─────────────────────────────────────────────────────────

export async function removeInvite(formData: FormData): Promise<void> {
  const staff = await assertStaffRole();

  const attendeeId = String(formData.get("attendeeId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!attendeeId || !eventId) return;

  // Verify event exists and belongs to user's ministry
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...ministryScope(staff) } as Prisma.EventWhereInput,
    select: { id: true },
  });
  if (!event) return;

  const attendee = await prisma.eventAttendee.findUnique({ where: { id: attendeeId } });
  if (!attendee || attendee.eventId !== eventId) return;

  await prisma.eventAttendee.delete({ where: { id: attendeeId } });

  await audit({
    actorId: staff.id,
    action: "REMOVE_INVITE",
    entityType: "EventAttendee",
    entityId: attendeeId,
    metadata: { eventId },
    ministryId: staff.ministryId,
  });

  revalidatePath(`/administrative/events/${eventId}/attendees`);
  revalidatePath(`/administrative/events/${eventId}`);
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

  // Verify event exists and belongs to user's ministry
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...ministryScope(staff) } as Prisma.EventWhereInput,
    select: { id: true },
  });
  if (!event) return { error: "Event not found or you don't have access." };

  const attendee = await prisma.eventAttendee.findUnique({ where: { id: attendeeId } });
  if (!attendee || attendee.eventId !== eventId) return { error: "Attendee not found." };

  await prisma.eventAttendee.update({
    where: { id: attendeeId },
    data: { status, respondedAt: status === "INVITED" ? null : new Date() },
  });

  await audit({
    actorId: staff.id,
    action: "UPDATE_ATTENDEE_STATUS",
    entityType: "EventAttendee",
    entityId: attendeeId,
    metadata: { eventId, status },
    ministryId: staff.ministryId,
  });

  revalidatePath(`/administrative/events/${eventId}/attendees`);
  revalidatePath(`/administrative/events/${eventId}`);
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
    include: { event: { select: { seriesId: true } } },
  });
  if (!attendee) return { error: "You do not have an invitation for this event." };

  const related = attendee.event.seriesId
    ? await prisma.eventAttendee.findMany({
        where: { userId: session.id, event: { seriesId: attendee.event.seriesId } },
        select: { id: true, eventId: true },
      })
    : [{ id: attendee.id, eventId }];

  await prisma.eventAttendee.updateMany({
    where: { id: { in: related.map((item) => item.id) } },
    data: { status, respondedAt: new Date() },
  });

  await audit({
    actorId: session.id,
    action: "SELF_RSVP",
    entityType: "EventAttendee",
    entityId: attendee.id,
    metadata: { eventId, status, occurrences: related.length },
    ministryId: session.ministryId,
  });

  for (const item of related) {
    revalidatePath(`/administrative/events/${item.eventId}`);
    revalidatePath(`/administrative/events/${item.eventId}/attendees`);
  }
  return { ok: true };
}
