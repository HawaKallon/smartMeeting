import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";

const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public-uploads");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

export async function savePublicImage(file: File): Promise<string> {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
    throw new Error("Only PNG, JPG, JPEG, and WebP images are allowed");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be smaller than 5MB");
  }

  await mkdir(PUBLIC_UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}${ext}`;
  const fullPath = path.join(PUBLIC_UPLOAD_DIR, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);

  return `/public-uploads/${storedName}`;
}
