// Platform access is restricted to government accounts. A valid government
// email is anything on the gov.sl domain — either the bare domain (@gov.sl) or
// any subdomain of it (@ministry.gov.sl, @health.gov.sl, …). External guests
// invited for attendance are NOT platform users and are not subject to this.

export const GOV_EMAIL_DOMAIN = "gov.sl";

export const GOV_EMAIL_ERROR =
  "Only government email addresses (ending in .gov.sl) can be added to the platform.";

/** Returns the lowercased domain part of an email (after the last `@`), or null. */
export function emailDomainOf(email: string | null | undefined): string | null {
  const normalized = (email ?? "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at === -1) return null;
  const domain = normalized.slice(at + 1);
  return domain || null;
}

/** True when a bare domain is gov.sl or a subdomain of it (case-insensitive). */
export function isGovDomain(domain: string | null | undefined): boolean {
  const normalized = (domain ?? "").trim().toLowerCase().replace(/^@/, "");
  return normalized === GOV_EMAIL_DOMAIN || normalized.endsWith("." + GOV_EMAIL_DOMAIN);
}

/** True when `email`'s domain is gov.sl or a subdomain of it (case-insensitive). */
export function isGovEmail(email: string | null | undefined): boolean {
  return isGovDomain(emailDomainOf(email));
}
