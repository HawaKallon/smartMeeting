import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// In-app notifications helper. Mirrors the error-swallowing pattern of audit.ts
// so a failed notification never breaks the primary action.

export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  ministryId?: string | null;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
        ministryId: params.ministryId ?? null,
      },
    });
  } catch (err) {
    // Notification logging must never break the primary action.
    console.error("[notify] failed to create notification", params.type, err);
  }
}
