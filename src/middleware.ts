import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
} from "@convex-dev/auth/nextjs/server";
import { safeNext } from "@/lib/safe-next";

const isPublicPage = createRouteMatcher(["/", "/auth", "/join"])

// legal pages, newsletter confirm/unsubscribe links and invite links are public for everyone, signed in or not
const isLegal = createRouteMatcher(["/terms", "/privacy", "/security", "/features(.*)", "/use-cases(.*)", "/compare(.*)", "/join/(.*)", "/newsletter/(.*)"])

const isApi = createRouteMatcher(["/api/(.*)"])

export default convexAuthNextjsMiddleware(async (request) => {
  const isInvite = request.nextUrl.pathname.startsWith("/join/");
  if (isLegal(request) && !isInvite) return undefined;

  const authenticated = await isAuthenticatedNextjs();

  // Invite link with a code and not signed in: skip the invite page and go straight to sign-up.
  // Afterwards the visitor comes back to this link and is added to the workspace automatically.
  if (isInvite && !authenticated && request.nextUrl.searchParams.get("code")) {
    const next = request.nextUrl.pathname + request.nextUrl.search;
    return NextResponse.redirect(new URL(`/auth?mode=signup&next=${encodeURIComponent(next)}`, request.url));
  }
  if (isInvite) return undefined;

  // API routes check auth themselves too, but unauthenticated callers get JSON 401, not a redirect
  if (isApi(request) && !request.nextUrl.pathname.startsWith("/api/auth")) {
    if (!authenticated) {
      return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
    }
    return undefined;
  }

  if (!isPublicPage(request) && !authenticated) {
    // remember where the visitor was going (e.g. an invite link) so we can send them back after sign-in
    const next = request.nextUrl.pathname + request.nextUrl.search;
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(next)}`, request.url));
  }

  if (isPublicPage(request) && authenticated) {
    const next = request.nextUrl.searchParams.get("next");
    // only follow same-site relative paths
    const target = safeNext(next) ?? "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};