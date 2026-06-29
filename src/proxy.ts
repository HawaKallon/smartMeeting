import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

// PRD §7 — gate the app behind authentication. (Next 16: middleware → proxy.)
// Fine-grained role checks live in server actions / page guards (lib/guard.ts).
//
// Uses a Prisma-free NextAuth instance so the Edge middleware never imports
// Node.js-only modules (@prisma/client, pg, bcrypt). The JWT is verified with
// the shared authConfig; no DB lookup happens here.

const { auth } = NextAuth(authConfig);

// /api/cron/* is authenticated in-route by a CRON_SECRET bearer token (called
// by an external scheduler, never a logged-in session), so it bypasses the
// login gate here.
const PUBLIC_PREFIXES = ["/login", "/checkin", "/api/auth", "/api/cron", "/public-calendar", "/public-uploads"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Run on all routes except static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)$).*)"],
};
