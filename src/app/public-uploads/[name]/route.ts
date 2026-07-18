import { readFile, stat } from "fs/promises";
import path from "path";
import { publicUploadPath } from "@/lib/publicUploads";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { safe, fullPath } = publicUploadPath(name);
  if (safe !== name || !MIME[path.extname(safe).toLowerCase()]) {
    return new Response("Not found", { status: 404 });
  }
  try {
    await stat(fullPath);
    const data = await readFile(fullPath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[path.extname(safe).toLowerCase()],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
