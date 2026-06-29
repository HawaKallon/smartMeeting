"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaffRole, ministryScope } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { transcribeFile } from "@/lib/transcription";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED = [".mp3", ".wav", ".m4a", ".webm", ".ogg"];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export type UploadResult = { ok: true; recordingId: string } | { ok: false; error: string };

export async function uploadRecording(formData: FormData): Promise<UploadResult> {
  const admin = await assertStaffRole();

  const eventId = String(formData.get("eventId") ?? "");
  const file = formData.get("file");
  if (!eventId) return { ok: false, error: "Missing event." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an audio file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File too large (max 100 MB)." };
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, ...ministryScope(admin) },
  });
  if (!event) return { ok: false, error: "Event not found or you don't have access." };

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return { ok: false, error: `Unsupported format. Allowed: ${ALLOWED.join(", ")}` };
  }

  // Persist the file (local disk; swap for object storage in production).
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  const recording = await prisma.recording.create({
    data: {
      eventId,
      fileUrl: `/uploads/${storedName}`,
      classification: event.classification,
      status: "PROCESSING",
    },
  });

  await audit({
    actorId: admin.id,
    action: "UPLOAD_RECORDING",
    entityType: "Recording",
    entityId: recording.id,
    metadata: { eventId, fileName: file.name, bytes: file.size },
    ministryId: admin.ministryId,
  });

  // Transcribe. Done inline here; structured so it can move to a worker/queue
  // (PRD §5 Redis/Celery) without touching the call sites.
  try {
    const { provider, segments } = await transcribeFile(fullPath, file.name);
    await prisma.transcript.create({
      data: { recordingId: recording.id, provider, segments },
    });
    await prisma.recording.update({
      where: { id: recording.id },
      data: { status: "TRANSCRIBED" },
    });
    await audit({
      actorId: admin.id,
      action: "TRANSCRIBE_RECORDING",
      entityType: "Recording",
      entityId: recording.id,
      metadata: { provider, segmentCount: segments.length },
      ministryId: admin.ministryId,
    });
  } catch (err) {
    await prisma.recording.update({
      where: { id: recording.id },
      data: { status: "FAILED" },
    });
    return {
      ok: false,
      error: `Saved, but transcription failed: ${(err as Error).message}`,
    };
  }

  revalidatePath(`/administrative/events/${eventId}`);
  return { ok: true, recordingId: recording.id };
}
