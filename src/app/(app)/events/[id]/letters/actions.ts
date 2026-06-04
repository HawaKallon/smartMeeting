"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaffRole } from "@/lib/guard";
import { audit } from "@/lib/audit";

export type ActionState = { error?: string; ok?: true; letterId?: string } | undefined;

// ── Create letter ────────────────────────────────────────────────────────────

const LetterSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  colorCategory: z.enum(["RED", "AMBER", "GREEN"]),
});

export async function createLetter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await assertStaffRole();

  const parsed = LetterSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    body: formData.get("body"),
    colorCategory: formData.get("colorCategory"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { eventId, title, body, colorCategory } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: "Event not found." };

  const letter = await prisma.letter.create({
    data: { eventId, title, body, colorCategory },
  });

  await audit({
    actorId: staff.id,
    action: "CREATE_LETTER",
    entityType: "Letter",
    entityId: letter.id,
    metadata: { eventId, title, colorCategory },
  });

  revalidatePath(`/events/${eventId}/letters`);
  return { ok: true, letterId: letter.id };
}

// ── Update letter ────────────────────────────────────────────────────────────

const UpdateSchema = z.object({
  letterId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  colorCategory: z.enum(["RED", "AMBER", "GREEN"]),
});

export async function updateLetter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await assertStaffRole();

  const parsed = UpdateSchema.safeParse({
    letterId: formData.get("letterId"),
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    body: formData.get("body"),
    colorCategory: formData.get("colorCategory"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { letterId, eventId, title, body, colorCategory } = parsed.data;

  const letter = await prisma.letter.findUnique({ where: { id: letterId } });
  if (!letter || letter.eventId !== eventId) return { error: "Letter not found." };

  await prisma.letter.update({
    where: { id: letterId },
    data: { title, body, colorCategory },
  });

  await audit({
    actorId: staff.id,
    action: "UPDATE_LETTER",
    entityType: "Letter",
    entityId: letterId,
    metadata: { eventId, title, colorCategory },
  });

  revalidatePath(`/events/${eventId}/letters`);
  return { ok: true };
}

// ── Delete letter ────────────────────────────────────────────────────────────

export async function deleteLetter(formData: FormData): Promise<void> {
  const staff = await assertStaffRole();

  const letterId = String(formData.get("letterId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!letterId || !eventId) return;

  const letter = await prisma.letter.findUnique({ where: { id: letterId } });
  if (!letter || letter.eventId !== eventId) return;

  await prisma.letter.delete({ where: { id: letterId } });

  await audit({
    actorId: staff.id,
    action: "DELETE_LETTER",
    entityType: "Letter",
    entityId: letterId,
    metadata: { eventId },
  });

  revalidatePath(`/events/${eventId}/letters`);
}
