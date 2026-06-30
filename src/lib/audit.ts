import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// PRD §7 — append-only audit trail. Never updated or deleted.

function normalizeMetadata(metadata: Prisma.InputJsonValue | undefined) {
  if (metadata === undefined) return undefined;

  try {
    return JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
  } catch {
    return { warning: "UNSERIALIZABLE_AUDIT_METADATA" } satisfies Prisma.InputJsonValue;
  }
}

export async function audit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ministryId?: string | null;
}) {
  try {
    const inferredMinistryId =
      params.ministryId !== undefined
        ? params.ministryId
        : params.actorId
          ? (
              await prisma.user.findUnique({
                where: { id: params.actorId },
                select: { ministryId: true },
              })
            )?.ministryId ?? null
          : null;

    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: normalizeMetadata(params.metadata),
        ministryId: inferredMinistryId,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary action.
    console.error("[audit] failed to record", params.action, err);
  }
}
