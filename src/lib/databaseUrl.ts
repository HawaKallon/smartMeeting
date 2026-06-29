const LEGACY_STRICT_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

/**
 * pg currently treats these legacy sslmode values as verify-full and warns that
 * their meaning will weaken in its next major release. Make the intended strict
 * certificate and hostname verification explicit without exposing the URL.
 */
export function normalizedDatabaseUrl(value = process.env.DATABASE_URL): string {
  if (!value) throw new Error("DATABASE_URL is not configured");

  const url = new URL(value);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode && LEGACY_STRICT_SSL_MODES.has(sslMode)) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}
