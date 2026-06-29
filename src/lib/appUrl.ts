const LOCAL_APP_URL = "http://localhost:3000";

function normalizeAppUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Return the public application origin used in emails and background jobs.
 * Vercel supplies its own host variables, so production does not require a
 * manually maintained URL when the deployment domain changes.
 */
export function getAppUrl(): string {
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const url = normalizeAppUrl(candidate);
    if (url) return url;
  }

  return LOCAL_APP_URL;
}

export function absoluteAppUrl(pathname: string): string {
  return new URL(pathname, `${getAppUrl()}/`).toString();
}
