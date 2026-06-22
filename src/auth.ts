import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isGovEmail } from "@/lib/govEmail";
import type { MinistryRole } from "@/generated/prisma/enums";
import authConfig from "./auth.config";

// PRD §6.1 / §7 — authentication + role-aware session.
// Phase 1 uses credentials (email + password) with a JWT session carrying the
// ministry role. Email OTP and government SSO slot in here later (PRD §8 Phase 3).

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: MinistryRole;
      ministryId: string | null;
    };
  }
  interface User {
    role: MinistryRole;
    ministryId: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Platform access is government-only — block non-.gov.sl logins even if
        // a legacy account record happens to exist.
        if (!isGovEmail(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          ministryId: user.ministryId,
        };
      },
    }),
  ],
});
