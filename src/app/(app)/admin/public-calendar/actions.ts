"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertAdminRole, ministryScope, assertSameMinistry } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { savePublicImage } from "@/lib/public-uploads";

const PublicEventSchema = z
  .object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional(),
    category: z.string().optional(),
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

export type ActionState = { error?: string } | undefined;

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

  try {
    let bannerImage: string | undefined;
    const bannerFile = formData.get("bannerImage") as File | null;
    if (bannerFile && bannerFile.size > 0) {
      bannerImage = await savePublicImage(bannerFile);
    }

    const event = await prisma.publicEvent.create({
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
        ministryId: user.ministryId,
        createdById: user.id,
        status: "DRAFT",
      },
    });

    await audit({
      actorId: user.id,
      action: "CREATE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: event.id,
      ministryId: user.ministryId,
      metadata: { title: event.title },
    });

    revalidatePath("/public-calendar");
    revalidatePath("/admin/public-calendar");
    redirect(`/admin/public-calendar/${event.id}/edit`);
  } catch (err) {
    console.error("Failed to create public event:", err);
    return { error: "Failed to create event" };
  }
}

export async function updatePublicEvent(
  eventId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.publicEvent.findUnique({
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

  try {
    let bannerImage: string | undefined;
    const bannerFile = formData.get("bannerImage") as File | null;
    if (bannerFile && bannerFile.size > 0) {
      bannerImage = await savePublicImage(bannerFile);
    }

    const updated = await prisma.publicEvent.update({
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
      },
    });

    await audit({
      actorId: user.id,
      action: "UPDATE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId: user.ministryId,
      metadata: { title: updated.title },
    });

    revalidatePath("/public-calendar");
    revalidatePath("/admin/public-calendar");
    return { error: undefined };
  } catch (err) {
    console.error("Failed to update public event:", err);
    return { error: "Failed to update event" };
  }
}

export async function publishPublicEvent(eventId: string): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.publicEvent.findUnique({
    where: { id: eventId },
    select: { ministryId: true, status: true },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  assertSameMinistry(user, event.ministryId);

  try {
    const updated = await prisma.publicEvent.update({
      where: { id: eventId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    await audit({
      actorId: user.id,
      action: "PUBLISH_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId: user.ministryId,
      metadata: { title: updated.title },
    });

    revalidatePath("/public-calendar");
    revalidatePath("/admin/public-calendar");
    return undefined;
  } catch (err) {
    console.error("Failed to publish public event:", err);
    return { error: "Failed to publish event" };
  }
}

export async function unpublishPublicEvent(eventId: string): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.publicEvent.findUnique({
    where: { id: eventId },
    select: { ministryId: true },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  assertSameMinistry(user, event.ministryId);

  try {
    const updated = await prisma.publicEvent.update({
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
      ministryId: user.ministryId,
      metadata: { title: updated.title },
    });

    revalidatePath("/public-calendar");
    revalidatePath("/admin/public-calendar");
    return undefined;
  } catch (err) {
    console.error("Failed to unpublish public event:", err);
    return { error: "Failed to unpublish event" };
  }
}

export async function deletePublicEvent(eventId: string): Promise<ActionState> {
  const user = await assertAdminRole();

  const event = await prisma.publicEvent.findUnique({
    where: { id: eventId },
    select: { ministryId: true, title: true },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  assertSameMinistry(user, event.ministryId);

  try {
    await prisma.publicEvent.delete({
      where: { id: eventId },
    });

    await audit({
      actorId: user.id,
      action: "DELETE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId: user.ministryId,
      metadata: { title: event.title },
    });

    revalidatePath("/public-calendar");
    revalidatePath("/admin/public-calendar");
    redirect("/admin/public-calendar");
  } catch (err) {
    console.error("Failed to delete public event:", err);
    return { error: "Failed to delete event" };
  }
}
