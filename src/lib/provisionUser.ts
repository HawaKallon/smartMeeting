import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/appUrl";
import type { MinistryRole } from "@/generated/prisma/enums";
import type { User } from "@/generated/prisma/client";

// Generates a readable temporary password for first-time login (PRD §6.1).
export function generateTempPassword(): string {
  // 12 url-safe chars, then strip ambiguous separators.
  return randomBytes(12).toString("base64url").replace(/[-_]/g, "").slice(0, 12);
}

/**
 * Creates a platform user with a temporary password and emails them an invite.
 * Shared by user creation and ministry-admin provisioning so the flow stays
 * identical everywhere (PRD §6.1). Callers are responsible for authorization,
 * email-domain validation, and audit logging.
 */
export async function provisionUser({
  name,
  email,
  role,
  ministryId,
}: {
  name: string;
  email: string;
  role: SystemRole;
  ministryId: string | null;
}): Promise<{ user: User; emailSent: boolean }> {
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: { name, email, role, ministryId, passwordHash },
  });

  // Send welcome email (with temp password) via the shared, verified-domain sender.
  const loginUrl = absoluteAppUrl("/administrative/login");
  const emailSent = await sendWelcomeEmail({ to: email, toName: name, loginUrl, tempPassword });

  return { user, emailSent };
}

/**
 * Issues a fresh temporary password to an existing user and re-sends the invite
 * email. Backs both "reset password" and "resend invite" — the original temp
 * password is only stored hashed, so it can never be re-sent verbatim.
 */
export async function regenerateTempPassword(
  userId: string,
): Promise<{ user: User; emailSent: boolean }> {
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  const loginUrl = absoluteAppUrl("/administrative/login");
  const emailSent = await sendWelcomeEmail({
    to: user.email,
    toName: user.name ?? user.email,
    loginUrl,
    tempPassword,
  });

  return { user, emailSent };
}
