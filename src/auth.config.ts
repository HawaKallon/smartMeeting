import type { NextAuthConfig } from "next-auth";
import type { MinistryRole, SystemRole } from "@/generated/prisma/enums";

// Edge-compatible auth config — no Node.js-only imports (no Prisma, no bcrypt).
// Used by the middleware (proxy.ts) to verify JWT sessions without touching the DB.
// The Credentials provider (Prisma DB lookup) is added in auth.ts for server-side use.

const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/administrative/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.systemRole = (user as unknown as { role: SystemRole }).role;
        token.systemRole = (user as unknown as { systemRole: SystemRole }).systemRole;
        token.jobTitle = (user as unknown as { jobTitle: string | null }).jobTitle;
        token.ministryId = (user as unknown as { ministryId: string | null }).ministryId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: MinistryRole }).role = (token.role as MinistryRole) || "STAFF_MEMBER";
        (session.user as { systemRole: SystemRole }).systemRole = token.systemRole as SystemRole;
        (session.user as { jobTitle: string | null }).jobTitle = token.jobTitle as string | null;
        (session.user as { ministryId: string | null }).ministryId = token.ministryId as string | null;
      }
      return session;
    },
  },
};

export default authConfig;
