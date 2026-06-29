import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "./auth.config";

// PRD §7 — gate the app behind authentication. (Next 16: middleware → proxy.)
// Fine-grained role checks live in server actions / page guards (lib/guard.ts).
//
// Uses a Prisma-free NextAuth instance so the Edge middleware never imports
// Node.js-only modules (@prisma/client, pg, bcrypt). The JWT is verified with
// the shared authConfig; no DB lookup happens here.

const { auth } = NextAuth(authConfig);

const ADMIN_PREFIX = "/administrative";
const PUBLIC_PREFIXES = ["/checkin", "/rsvp", "/api/auth", "/api/cron", "/public-calendar", "/public-uploads"];
const LEGACY_INTERNAL_PREFIXES = [
  "/admin",
  "/attendance",
  "/calendar",
  "/events",
  "/help",
  "/kanban",
  "/notifications",
  "/profile",
  "/reports",
  "/rooms",
  "/search",
  "/settings",
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function loginRedirect(req: NextRequest) {
  const url = new URL(`${ADMIN_PREFIX}/login`, req.nextUrl.origin);
  url.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Preserve bookmarks and previously sent links while making the administrative
  // namespace canonical in the browser.
  if (pathname === "/login" || pathname === "/forbidden") {
    const url = req.nextUrl.clone();
    url.pathname = `${ADMIN_PREFIX}${pathname}`;
    return NextResponse.redirect(url);
  }
  if (LEGACY_INTERNAL_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    const url = req.nextUrl.clone();
    url.pathname = `${ADMIN_PREFIX}${pathname}`;
    return NextResponse.redirect(url);
  }

  // The old public-calendar index remains a compatibility alias for the new
  // canonical homepage. Day and event-detail pages stay under /public-calendar.
  if (pathname === "/public-calendar") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Login keeps its implementation at /login but is only exposed publicly at
  // /administrative/login.
  if (pathname === `${ADMIN_PREFIX}/login`) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.rewrite(url);
  }

  const isAdministrative = matchesPrefix(pathname, ADMIN_PREFIX);
  if (isAdministrative && !req.auth) return loginRedirect(req);

  // Administrative child URLs reuse the existing route modules while keeping
  // the prefixed URL visible to the user. /administrative itself is a physical
  // page because it replaced the former root dashboard.
  if (pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(ADMIN_PREFIX.length) || "/";
    return NextResponse.rewrite(url);
  }

  const isPublic = pathname === "/" || PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
  if (isPublic) return NextResponse.next();

  // API endpoints and private uploaded files retain their infrastructure URLs
  // but still require an authenticated session.
  const requiresAuth = pathname.startsWith("/api/") || matchesPrefix(pathname, "/uploads");
  if (requiresAuth && !req.auth) return loginRedirect(req);

  return NextResponse.next();
});

export const config = {
  // Run on all routes except static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)$).*)"],
};
