"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertAdminRole, assertSameMinistry } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { savePublicImage } from "@/lib/cloudinary";
import { queuePublicInvitationEmail } from "@/lib/email-queue";
import { notify } from "@/lib/notify";
import { PublicEventCategory } from "@/generated/prisma/enums";

const PublicEventSchema = z
  .object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional(),
    category: z.nativeEnum(PublicEventCategory).optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    venueName: z.string().optional(),
    externalUrl: z.string().url().optional().or(z.literal("")),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactPhone: z.string().optional(),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

// Extract invited ministry IDs from FormData (array field)
function getInvitedMinistryIds(formData: FormData): string[] {
  return formData.getAll("invitedMinistryIds").map(String).filter(Boolean);
}

export type ActionState = { error?: string };

export async function createPublicEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertAdminRole();

  const parsed = PublicEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    venueName: formData.get("venueName") || undefined,
    externalUrl: formData.get("externalUrl") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const invitedMinistryIds = getInvitedMinistryIds(formData);

  let eventId: string | undefined;
  try {
    let bannerImage: string | undefined;
    const bannerFile = formData.get("bannerImage") as File | null;
    if (bannerFile && bannerFile.size > 0) {
      try {
        bannerImage = await savePublicImage(bannerFile);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload image";
        return { error: message };
      }
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        startAt: data.startAt,
        endAt: data.endAt,
        venueName: data.venueName,
        bannerImage,
        externalUrl: data.externalUrl || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        ministryId: user.ministryId!,
        status: "DRAFT",
        invitedMinistries: {
          connect: invitedMinistryIds.map((id) => ({ id })),
        },
      },
    });

    eventId = event.id;

    await audit({
      actorId: user.id,
      action: "CREATE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: event.id,
      ministryId: user.ministryId!,
      metadata: { title: event.title, invitedMinistryCount: invitedMinistryIds.length },
    });
  } catch (err) {
    console.error("Failed to create public event:", err);
    return { error: "Failed to create event" };
  }

  revalidatePath("/public-calendar");
  revalidatePath("/administrative/admin/public-calendar");
  redirect(`/administrative/admin/public-calendar/${eventId}/edit`);
}

export async function updatePublicEvent(
  eventId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ministryId: true },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  assertSameMinistry(user, event.ministryId);

  const parsed = PublicEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    venueName: formData.get("venueName") || undefined,
    externalUrl: formData.get("externalUrl") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const invitedMinistryIds = getInvitedMinistryIds(formData);

  try {
    let bannerImage: string | undefined;
    const bannerFile = formData.get("bannerImage") as File | null;
    if (bannerFile && bannerFile.size > 0) {
      bannerImage = await savePublicImage(bannerFile);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        startAt: data.startAt,
        endAt: data.endAt,
        venueName: data.venueName,
        externalUrl: data.externalUrl || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        ...(bannerImage && { bannerImage }),
        invitedMinistries: {
          set: invitedMinistryIds.map((id) => ({ id })),
        },
      },
    });

    await audit({
      actorId: user.id,
      action: "UPDATE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId: user.ministryId!,
      metadata: { title: updated.title, invitedMinistryCount: invitedMinistryIds.length },
    });

    revalidatePath("/public-calendar");
    revalidatePath("/administrative/admin/public-calendar");
    return {};
  } catch (err) {
    console.error("Failed to update public event:", err);
    return { error: "Failed to update event" };
  }
}

export async function publishPublicEvent(eventId: string): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ministryId: true, status: true, title: true, description: true, startAt: true, endAt: true, venueName: true },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  assertSameMinistry(user, event.ministryId);

  try {
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      include: { invitedMinistries: { select: { id: true, name: true } }, ministry: { select: { name: true } } },
    });

    await audit({
      actorId: user.id,
      action: "PUBLISH_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId: user.ministryId!,
      metadata: { title: updated.title },
    });

    // Notify leadership at invited ministries (async, don't block on errors)
    (async () => {
      try {
        if (updated.invitedMinistries.length === 0) return;

        const invitedMinistryIds = updated.invitedMinistries.map((m) => m.id);
        const organizerMinistryName = updated.ministry?.name || "Government of Sierra Leone";

        // Find ministry-level recipients at invited ministries
        const recipients = await prisma.user.findMany({
          where: {
            ministryId: { in: invitedMinistryIds },
            active: true,
            systemRole: { in: ["MINISTRY_ADMIN", "MINISTER"] },
          },
          select: { id: true, email: true, name: true, ministryId: true, emailNotifications: true },
        });

        if (recipients.length === 0) return;

        // Build absolute URL to event detail page
        const baseUrl = process.env.NEXTAUTH_URL || "https://smartmeeting.gov.sl";
        const eventUrl = `${baseUrl}/public-calendar/event/${eventId}`;

        // Fan out notifications (never break publish on email/notify failures)
        for (const recipient of recipients) {
          try {
            // In-app notification (always)
            await notify({
              userId: recipient.id,
              type: "PUBLIC_EVENT_INVITE",
              title: `Invitation: ${updated.title}`,
              body: `Your ministry has been invited to attend ${updated.title}.`,
              link: `/public-calendar/event/${eventId}`,
              ministryId: recipient.ministryId,
            });

            // Queue email (if enabled) - non-blocking
            if (recipient.emailNotifications) {
              queuePublicInvitationEmail({
                to: recipient.email,
                toName: recipient.name || "User",
                eventTitle: updated.title,
                eventDescription: updated.description,
                startAt: updated.startAt,
                endAt: updated.endAt,
                venueName: updated.venueName,
                organizerMinistryName,
                eventUrl,
              }).catch((err) => {
                console.error(
                  `[email-queue] failed to queue email to ${recipient.email} for event ${eventId}:`,
                  err,
                );
              });
            }
          } catch (notifyErr) {
            console.error(
              `[publishPublicEvent] failed to notify user ${recipient.id} for event ${eventId}:`,
              notifyErr,
            );
            // Continue to next recipient
          }
        }
      } catch (notificationErr) {
        console.error(`[publishPublicEvent] notification fan-out failed for event ${eventId}:`, notificationErr);
        // Don't rethrow — publish succeeded; notifications are fire-and-forget
      }
    })();

    revalidatePath("/public-calendar");
    revalidatePath("/administrative/admin/public-calendar");
    return {};
  } catch (err) {
    console.error("Failed to publish public event:", err);
    return { error: "Failed to publish event" };
  }
}

export async function unpublishPublicEvent(eventId: string): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ministryId: true },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  assertSameMinistry(user, event.ministryId);

  try {
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
    });

    await audit({
      actorId: user.id,
      action: "UNPUBLISH_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId: user.ministryId!,
      metadata: { title: updated.title },
    });

    revalidatePath("/public-calendar");
    revalidatePath("/administrative/admin/public-calendar");
    return {};
  } catch (err) {
    console.error("Failed to unpublish public event:", err);
    return { error: "Failed to unpublish event" };
  }
}

export async function deletePublicEvent(eventId: string): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ministryId: true, title: true },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  assertSameMinistry(user, event.ministryId);

  try {
    await prisma.event.delete({
      where: { id: eventId },
    });

    await audit({
      actorId: user.id,
      action: "DELETE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId: user.ministryId!,
      metadata: { title: event.title },
    });
  } catch (err) {
    console.error("Failed to delete public event:", err);
    return { error: "Failed to delete event" };
  }

  revalidatePath("/public-calendar");
  revalidatePath("/administrative/admin/public-calendar");
  redirect("/administrative/admin/public-calendar");
}
