import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";

const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public-uploads");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const p = await params;
  const filePath = path.join(PUBLIC_UPLOAD_DIR, p.name);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_UPLOAD_DIR)) {
    return notFound();
  }

  try {
    const fileBuffer = await readFile(filePath);
    const ext = path.extname(p.name).toLowerCase();
    const mimeType = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    }[ext] || "application/octet-stream";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return notFound();
  }
}
