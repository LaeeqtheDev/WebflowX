import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/", "/auth", "/join"])

const isApi = createRouteMatcher(["/api/(.*)"])

export default convexAuthNextjsMiddleware(async (request) => {
  const authenticated = await isAuthenticatedNextjs();

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
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};