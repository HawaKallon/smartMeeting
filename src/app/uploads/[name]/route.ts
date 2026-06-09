import { readFile, stat } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Serve uploaded audio to authenticated users only (PRD §7 — recordings are
// sensitive). Files live outside /public so they are never publicly served.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { name } = await params;
  // Prevent path traversal.
  const safe = path.basename(name);
  const full = path.join(UPLOAD_DIR, safe);
  if (!full.startsWith(UPLOAD_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    await stat(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const data = await readFile(full);
  const ext = path.extname(safe).toLowerCase();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}
