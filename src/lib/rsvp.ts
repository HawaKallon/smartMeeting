import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function createRsvpToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashRsvpToken(token) };
}

export function hashRsvpToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function validRsvpToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,80}$/.test(token);
}

export function publicAppUrl(): string {
  return (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function rsvpUrl(token: string, response?: "CONFIRMED" | "DECLINED"): string {
  const url = new URL(`/rsvp/${encodeURIComponent(token)}`, publicAppUrl());
  if (response) url.searchParams.set("response", response);
  return url.toString();
}
