// Platform access is restricted to government accounts. A valid government
// email is anything on the gov.sl domain — either the bare domain (@gov.sl) or
// any subdomain of it (@ministry.gov.sl, @health.gov.sl, …). External guests
// invited for attendance are NOT platform users and are not subject to this.

export const GOV_EMAIL_DOMAIN = "gov.sl";

export const GOV_EMAIL_ERROR =
  "Only government email addresses (ending in .gov.sl) can be added to the platform.";

/** True when `email`'s domain is gov.sl or a subdomain of it (case-insensitive). */
export function isGovEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at === -1) return false;
  const domain = normalized.slice(at + 1);
  return domain === GOV_EMAIL_DOMAIN || domain.endsWith("." + GOV_EMAIL_DOMAIN);
}
