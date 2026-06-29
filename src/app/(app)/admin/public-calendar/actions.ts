"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { assertAdminRole, ministryScope } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { PublicEventFormSchema, publicEventInput, type PublicEventFormState } from "@/lib/publicEvents";
import { deletePublicImage, savePublicImage } from "@/lib/publicUploads";

function refreshPublicCalendar(id?: string) {
  revalidatePath("/public-calendar", "layout");
  revalidatePath("/admin/public-calendar");
  if (id) revalidatePath(`/public-calendar/event/${id}`);
}

async function resolveMinistryId(user: Awaited<ReturnType<typeof assertAdminRole>>, formData: FormData) {
  const ministryId = isSuperAdmin(user.role) ? String(formData.get("ministryId") ?? "") : user.ministryId;
  if (!ministryId) throw new Error("A ministry is required");
  const ministry = await prisma.ministry.findUnique({ where: { id: ministryId }, select: { id: true } });
  if (!ministry) throw new Error("Selected ministry was not found");
  return ministryId;
}

function message(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const safeMessages: Record<string, string> = {
    UNAUTHENTICATED: "Sign in to manage public events",
    FORBIDDEN: "You are not allowed to manage this public event",
    "A ministry is required": "A ministry is required",
    "Selected ministry was not found": "Selected ministry was not found",
    "Only PNG, JPEG, and WebP images are allowed": "Only PNG, JPEG, and WebP images are allowed",
    "Banner image must be smaller than 5 MB": "Banner image must be smaller than 5 MB",
  };
  return safeMessages[error.message] ?? fallback;
}

export async function createPublicEvent(
  _state: PublicEventFormState,
  formData: FormData,
): Promise<PublicEventFormState> {
  let newBanner: string | null = null;
  let createdId: string | null = null;
  try {
    const user = await assertAdminRole();
    const parsed = PublicEventFormSchema.safeParse(publicEventInput(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid event details" };
    const ministryId = await resolveMinistryId(user, formData);
    const file = formData.get("banner");
    if (file instanceof File && file.size > 0) newBanner = await savePublicImage(file);

    const event = await prisma.publicEvent.create({
      data: {
        ...parsed.data,
        bannerImage: newBanner,
        ministryId,
        createdById: user.id,
      },
    });
    createdId = event.id;
    await audit({
      actorId: user.id,
      action: "CREATE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: event.id,
      ministryId,
      metadata: { title: event.title, status: event.status },
    });
    refreshPublicCalendar(event.id);
  } catch (error) {
    if (newBanner && !createdId) await deletePublicImage(newBanner);
    console.error("Failed to create public event", error);
    return { error: message(error, "Failed to create public event") };
  }
  redirect("/admin/public-calendar");
}

export async function updatePublicEvent(
  eventId: string,
  _state: PublicEventFormState,
  formData: FormData,
): Promise<PublicEventFormState> {
  let newBanner: string | null = null;
  try {
    const user = await assertAdminRole();
    const existing = await prisma.publicEvent.findFirst({
      where: { id: eventId, ...ministryScope(user) },
      select: { id: true, ministryId: true, bannerImage: true },
    });
    if (!existing) return { error: "Public event not found" };
    const parsed = PublicEventFormSchema.safeParse(publicEventInput(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid event details" };
    const ministryId = await resolveMinistryId(user, formData);
    const file = formData.get("banner");
    if (file instanceof File && file.size > 0) newBanner = await savePublicImage(file);

    const updated = await prisma.publicEvent.update({
      where: { id: eventId },
      data: {
        ...parsed.data,
        ministryId,
        ...(newBanner ? { bannerImage: newBanner } : {}),
      },
    });
    await audit({
      actorId: user.id,
      action: "UPDATE_PUBLIC_EVENT",
      entityType: "PublicEvent",
      entityId: eventId,
      ministryId,
      metadata: { title: updated.title },
    });
    if (newBanner) await deletePublicImage(existing.bannerImage);
    refreshPublicCalendar(eventId);
  } catch (error) {
    if (newBanner) await deletePublicImage(newBanner);
    console.error("Failed to update public event", error);
    return { error: message(error, "Failed to update public event") };
  }
  redirect("/admin/public-calendar");
}

export async function publishPublicEvent(eventId: string): Promise<{ error?: string }> {
  try {
    const user = await assertAdminRole();
    const event = await prisma.publicEvent.findFirst({ where: { id: eventId, ...ministryScope(user) } });
    if (!event) return { error: "Public event not found" };
    if (event.status !== "DRAFT") return { error: "Only draft events can be published" };
    await prisma.publicEvent.update({ where: { id: eventId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await audit({ actorId: user.id, action: "PUBLISH_PUBLIC_EVENT", entityType: "PublicEvent", entityId: eventId, ministryId: event.ministryId, metadata: { title: event.title } });
    refreshPublicCalendar(eventId);
    return {};
  } catch (error) {
    console.error("Failed to publish public event", error);
    return { error: message(error, "Failed to publish public event") };
  }
}

export async function unpublishPublicEvent(eventId: string): Promise<{ error?: string }> {
  try {
    const user = await assertAdminRole();
    const event = await prisma.publicEvent.findFirst({ where: { id: eventId, ...ministryScope(user) } });
    if (!event) return { error: "Public event not found" };
    if (event.status !== "PUBLISHED") return { error: "Only published events can be unpublished" };
    await prisma.publicEvent.update({ where: { id: eventId }, data: { status: "DRAFT", publishedAt: null } });
    await audit({ actorId: user.id, action: "UNPUBLISH_PUBLIC_EVENT", entityType: "PublicEvent", entityId: eventId, ministryId: event.ministryId, metadata: { title: event.title } });
    refreshPublicCalendar(eventId);
    return {};
  } catch (error) {
    console.error("Failed to unpublish public event", error);
    return { error: message(error, "Failed to unpublish public event") };
  }
}

export async function deletePublicEvent(eventId: string): Promise<{ error?: string }> {
  try {
    const user = await assertAdminRole();
    const event = await prisma.publicEvent.findFirst({ where: { id: eventId, ...ministryScope(user) } });
    if (!event) return { error: "Public event not found" };
    await prisma.publicEvent.delete({ where: { id: eventId } });
    await audit({ actorId: user.id, action: "DELETE_PUBLIC_EVENT", entityType: "PublicEvent", entityId: eventId, ministryId: event.ministryId, metadata: { title: event.title, status: event.status } });
    await deletePublicImage(event.bannerImage);
    refreshPublicCalendar(eventId);
    return {};
  } catch (error) {
    console.error("Failed to delete public event", error);
    return { error: message(error, "Failed to delete public event") };
  }
}
