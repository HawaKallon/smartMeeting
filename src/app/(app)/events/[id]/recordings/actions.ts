// DISABLED: Recording feature is not in use and causes slow uploads
// (synchronously awaits OpenAI Whisper transcription). Re-enable only after
// moving transcription to a background job queue (see performance-review.md Finding 10).
//
// Original file below (all commented out):
//
// "use server";
//
// import { mkdir, writeFile } from "fs/promises";
// import path from "path";
// import { randomUUID } from "crypto";
// import { revalidatePath } from "next/cache";
// import { prisma } from "@/lib/prisma";
// import { requireUser } from "@/lib/guard";
// import { audit } from "@/lib/audit";
// import { transcribeFile } from "@/lib/transcription";
// import { canManageExistingEvent } from "@/lib/eventAccess";
//
// const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// const ALLOWED = [".mp3", ".wav", ".m4a", ".webm", ".ogg"];
// const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
//
// export type UploadResult = { ok: true; recordingId: string } | { ok: false; error: string };
//
// export async function uploadRecording(formData: FormData): Promise<UploadResult> {
//   const user = await requireUser();
//   const eventId = String(formData.get("eventId") ?? "");
//   const file = formData.get("file");
//   // ... rest of implementation commented out ...
// }
