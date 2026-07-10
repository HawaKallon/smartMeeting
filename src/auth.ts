import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { isGovEmail, emailDomainOf } from "@/lib/govEmail";
import type { MinistryRole, SystemRole } from "@/generated/prisma/enums";
import authConfig from "./auth.config";

// PRD §6.1 / §7 — authentication + role-aware session.
// Phase 1 uses credentials (email + password) with a JWT session carrying the
// ministry role. Email OTP and government SSO slot in here later (PRD §8 Phase 3).
// P2: Added systemRole (access level) and jobTitle (org title) alongside role (deprecated).

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: SystemRole; // deprecated, kept for backwards compat during P2.4 cutover
      systemRole: SystemRole;
      jobTitle: string | null;
      ministryId: string | null;
    };
  }
  interface User {
    role: SystemRole; // deprecated
    systemRole: SystemRole;
    jobTitle: string | null;
    ministryId: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // @ts-ignore NextAuth User type doesn't support our custom fields (systemRole, jobTitle)
    // but the augmented interface includes them. This is correct at runtime.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // @ts-ignore NextAuth User type constraint
      authorize: async (credentials: any, _request: any) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Platform access is government-only — block non-.gov.sl logins even if
        // a legacy account record happens to exist.
        if (!isGovEmail(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            systemRole: true,
            jobTitle: true,
            ministryId: true,
            passwordHash: true,
            active: true,
          },
        });
        if (!user?.passwordHash) return null;

        // Deactivated accounts cannot log in (applies to all roles).
        if (!user.active) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Ministry membership is resolved from the email domain at login — the
        // ministry's emailDomain (e.g. "mocti.gov.sl") is the source of truth.
        // Super-admins are platform-wide and keep a null ministry.
        let ministryId: string | null = user.ministryId;
        if (user.systemRole !== "SUPER_ADMIN") {
          const domain = emailDomainOf(email);
          const ministry = domain
            ? await prisma.ministry.findUnique({
                where: { emailDomain: domain },
                select: { id: true, active: true },
              })
            : null;
          // No matching ministry (or it's deactivated) → deny access.
          if (!ministry || !ministry.active) return null;
          ministryId = ministry.id;
          // Keep the stored ministry in sync with the resolved domain.
          if (user.ministryId !== ministry.id) {
            await prisma.user.update({
              where: { id: user.id },
              data: { ministryId: ministry.id },
            });
          }
        }

        await audit({
          actorId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          ministryId,
          metadata: {
            email: user.email,
            role: user.systemRole,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.systemRole,
          systemRole: user.systemRole || "STAFF", // fallback for backfilled users
          jobTitle: user.jobTitle,
          ministryId,
        };
      },
    }),
  ],
});
