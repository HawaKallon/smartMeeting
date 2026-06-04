"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { hasVenueConflict } from "@/lib/events";

const EventSchema = z
  .object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional(),
    type: z.enum(["MEETING", "CONFERENCE", "APPOINTMENT"]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    venueName: z.string().optional(),
    venueLat: z.coerce.number().min(-90).max(90).optional(),
    venueLng: z.coerce.number().min(-180).max(180).optional(),
    geofenceRadius: z.coerce.number().int().positive().max(10000).default(100),
    colorCategory: z.enum(["RED", "AMBER", "GREEN"]).optional(),
    classification: z.enum(["PUBLIC", "RESTRICTED"]).default("PUBLIC"),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

export type ActionState = { error?: string } | undefined;

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole("ADMIN");

  const parsed = EventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    venueName: formData.get("venueName") || undefined,
    venueLat: formData.get("venueLat") || undefined,
    venueLng: formData.get("venueLng") || undefined,
    geofenceRadius: formData.get("geofenceRadius") || 100,
    colorCategory: formData.get("colorCategory") || undefined,
    classification: formData.get("classification") || "PUBLIC",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const conflict = await hasVenueConflict({
    venueName: data.venueName ?? null,
    startAt: data.startAt,
    endAt: data.endAt,
  });
  if (conflict) {
    return { error: `Venue "${data.venueName}" is already booked for that time.` };
  }

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      startAt: data.startAt,
      endAt: data.endAt,
      venueName: data.venueName,
      venueLat: data.venueLat,
      venueLng: data.venueLng,
      geofenceRadius: data.geofenceRadius,
      colorCategory: data.colorCategory,
      classification: data.classification,
      organizerId: user.id,
    },
  });

  await audit({
    actorId: user.id,
    action: "CREATE_EVENT",
    entityType: "Event",
    entityId: event.id,
    metadata: { title: event.title },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/events/${event.id}`);
}
