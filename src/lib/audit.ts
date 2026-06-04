import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// PRD §7 — append-only audit trail. Never updated or deleted.

export async function audit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary action.
    console.error("[audit] failed to record", params.action, err);
  }
}
