import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/", "/auth", "/join"])
const isPublicApi = createRouteMatcher([
  "/api/livekit",
  "/api/ai-summary",
  "/api/liveblocks-auth",
  "/api/ai-editor"  // 👈 add this
]) // 👈 add this

export default convexAuthNextjsMiddleware(async (request) => {
  const authenticated = await isAuthenticatedNextjs();

  // 👈 allow these API routes through without auth check
  if (isPublicApi(request)) return undefined;

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