import { v2 as cloudinary } from "cloudinary";

const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

export async function savePublicImage(file: File): Promise<string> {
  if (!isConfigured) {
    throw new Error("Image upload not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env");
  }

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
    throw new Error("Only PNG, JPG, JPEG, and WebP images are allowed");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be smaller than 5MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "public-events",
        resource_type: "auto",
      },
      (err, result) => {
        if (err) {
          reject(new Error(`Image upload failed: ${err.message}`));
        } else if (result?.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(new Error("Image upload failed: no URL returned"));
        }
      },
    );

    uploadStream.end(buffer);
  });
}
