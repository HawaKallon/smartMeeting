import "server-only";

import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public-uploads");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

export async function savePublicImage(file: File) {
  const ext = path.extname(file.name).toLowerCase();
  const expectedType = TYPES.get(ext);
  if (!expectedType || file.type !== expectedType) {
    throw new Error("Only PNG, JPEG, and WebP images are allowed");
  }
  if (file.size > MAX_IMAGE_SIZE) throw new Error("Banner image must be smaller than 5 MB");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
  return `/public-uploads/${storedName}`;
}

export async function deletePublicImage(publicPath: string | null | undefined) {
  if (!publicPath?.startsWith("/public-uploads/")) return;
  const name = path.basename(publicPath);
  try {
    await unlink(path.join(UPLOAD_DIR, name));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to remove public banner", error);
  }
}

export function publicUploadPath(name: string) {
  const safe = path.basename(name);
  return { safe, fullPath: path.join(UPLOAD_DIR, safe) };
}
