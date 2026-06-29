"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guard";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { provisionUser } from "@/lib/provisionUser";
import { isGovEmail, isGovDomain, emailDomainOf, GOV_EMAIL_ERROR } from "@/lib/govEmail";

const MinistrySchema = z.object({
  name: z.string().min(2, "Ministry name is required").max(100),
  code: z.string().min(2, "Code is required").max(10).toUpperCase(),
  emailDomain: z
    .string()
    .min(3, "Email domain is required")
    .max(100)
    .trim()
    .toLowerCase()
    .transform((d) => d.replace(/^@/, "")),
  adminName: z.string().min(2, "Admin name is required").max(100),
  adminEmail: z.string().email("A valid admin email is required").toLowerCase().trim(),
});

export async function createMinistry(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; emailSent?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (!isSuperAdmin(user.role)) {
      return { error: "Only super-admins can create ministries" };
    }

    const parsed = MinistrySchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      emailDomain: formData.get("emailDomain"),
      adminName: formData.get("adminName"),
      adminEmail: formData.get("adminEmail"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, code, emailDomain, adminName, adminEmail } = parsed.data;

    // The domain must be a gov.sl (sub)domain so logins under it are valid.
    if (!isGovDomain(emailDomain)) {
      return { error: "Email domain must be a government domain ending in .gov.sl" };
    }

    // The first admin must belong to the ministry's own domain.
    if (!isGovEmail(adminEmail)) {
      return { error: GOV_EMAIL_ERROR };
    }
    if (emailDomainOf(adminEmail) !== emailDomain) {
      return { error: `Admin email must end in @${emailDomain}` };
    }

    // Uniqueness checks across ministries and users.
    const [codeTaken, domainTaken, emailTaken] = await Promise.all([
      prisma.ministry.findUnique({ where: { code } }),
      prisma.ministry.findUnique({ where: { emailDomain } }),
      prisma.user.findUnique({ where: { email: adminEmail } }),
    ]);

    if (codeTaken) return { error: `Ministry code "${code}" already exists` };
    if (domainTaken) return { error: `Email domain "${emailDomain}" is already in use` };
    if (emailTaken) return { error: "A user with the admin email already exists" };

    // Create ministry
    const ministry = await prisma.ministry.create({
      data: { name, code, emailDomain },
    });

    await audit({
      actorId: user.id,
      action: "CREATE_MINISTRY",
      entityType: "Ministry",
      entityId: ministry.id,
      metadata: { name, code, emailDomain },
    });

    // Provision the ministry's first admin (ADMIN role, scoped to this ministry).
    const { user: admin, emailSent } = await provisionUser({
      name: adminName,
      email: adminEmail,
      role: "ADMIN",
      ministryId: ministry.id,
    });

    await audit({
      actorId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: admin.id,
      metadata: { name: adminName, email: adminEmail, role: "ADMIN", emailSent },
      ministryId: ministry.id,
    });

    revalidatePath("/administrative/admin/ministries");
    return { ok: true, emailSent };
  } catch (err) {
    console.error("Failed to create ministry:", err);
    return { error: "Failed to create ministry" };
  }
}

export async function addMinistryAdmin(
  ministryId: string,
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; emailSent?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (!isSuperAdmin(user.role)) {
      return { error: "Only super-admins can add ministry admins" };
    }

    const parsed = z
      .object({
        adminName: z.string().min(2, "Admin name is required").max(100),
        adminEmail: z.string().email("A valid admin email is required").toLowerCase().trim(),
      })
      .safeParse({
        adminName: formData.get("adminName"),
        adminEmail: formData.get("adminEmail"),
      });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { adminName, adminEmail } = parsed.data;

    const ministry = await prisma.ministry.findUnique({ where: { id: ministryId } });
    if (!ministry) return { error: "Ministry not found" };
    if (!ministry.emailDomain) {
      return { error: "This ministry has no email domain configured" };
    }

    if (!isGovEmail(adminEmail)) {
      return { error: GOV_EMAIL_ERROR };
    }
    if (emailDomainOf(adminEmail) !== ministry.emailDomain) {
      return { error: `Admin email must end in @${ministry.emailDomain}` };
    }

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) return { error: "A user with this email already exists" };

    const { user: admin, emailSent } = await provisionUser({
      name: adminName,
      email: adminEmail,
      role: "ADMIN",
      ministryId: ministry.id,
    });

    await audit({
      actorId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: admin.id,
      metadata: { name: adminName, email: adminEmail, role: "ADMIN", emailSent },
      ministryId: ministry.id,
    });

    revalidatePath("/administrative/admin/ministries");
    return { ok: true, emailSent };
  } catch (err) {
    console.error("Failed to add ministry admin:", err);
    return { error: "Failed to add ministry admin" };
  }
}

export async function toggleMinistryActive(
  ministryId: string,
  newActive: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (!isSuperAdmin(user.role)) {
      return { error: "Only super-admins can manage ministries" };
    }

    const ministry = await prisma.ministry.update({
      where: { id: ministryId },
      data: { active: newActive },
    });

    // Audit log
    await audit({
      actorId: user.id,
      action: newActive ? "ACTIVATE_MINISTRY" : "DEACTIVATE_MINISTRY",
      entityType: "Ministry",
      entityId: ministryId,
      metadata: { name: ministry.name },
    });

    revalidatePath("/administrative/admin/ministries");
    return { ok: true };
  } catch (err) {
    console.error("Failed to toggle ministry:", err);
    return { error: "Failed to update ministry" };
  }
}

const UpdateMinistrySchema = z.object({
  name: z.string().min(2, "Ministry name is required").max(100),
  emailDomain: z
    .string()
    .min(3, "Email domain is required")
    .max(100)
    .trim()
    .toLowerCase()
    .transform((d) => d.replace(/^@/, "")),
});

export async function updateMinistry(
  ministryId: string,
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const user = await requireUser();

    if (!isSuperAdmin(user.role)) {
      return { error: "Only super-admins can edit ministries" };
    }

    const parsed = UpdateMinistrySchema.safeParse({
      name: formData.get("name"),
      emailDomain: formData.get("emailDomain"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, emailDomain } = parsed.data;

    if (!isGovDomain(emailDomain)) {
      return { error: "Email domain must be a government domain ending in .gov.sl" };
    }

    // Uniqueness across other ministries (exclude self).
    const [nameTaken, domainTaken] = await Promise.all([
      prisma.ministry.findFirst({ where: { name, id: { not: ministryId } } }),
      prisma.ministry.findFirst({ where: { emailDomain, id: { not: ministryId } } }),
    ]);
    if (nameTaken) return { error: `Ministry name "${name}" is already in use` };
    if (domainTaken) return { error: `Email domain "${emailDomain}" is already in use` };

    await prisma.ministry.update({
      where: { id: ministryId },
      data: { name, emailDomain },
    });

    await audit({
      actorId: user.id,
      action: "UPDATE_MINISTRY",
      entityType: "Ministry",
      entityId: ministryId,
      metadata: { name, emailDomain },
    });

    revalidatePath("/administrative/admin/ministries");
    return { ok: true };
  } catch (err) {
    console.error("Failed to update ministry:", err);
    return { error: "Failed to update ministry" };
  }
}
