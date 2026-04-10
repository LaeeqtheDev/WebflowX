import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/", "/auth", "/join"])
const isPublicApi = createRouteMatcher(["/api/livekit", "/api/ai-summary", "/api/liveblocks-auth" ])  // 👈 add this

export default convexAuthNextjsMiddleware(async (request) => {
  const authenticated = await isAuthenticatedNextjs(request as any);

  // 👈 allow these API routes through without auth check
  if (isPublicApi(request)) return undefined;

  if (!isPublicPage(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request as any, "/auth");
  }

  if (isPublicPage(request) && authenticated) {
    return nextjsMiddlewareRedirect(request as any, "/dashboard");
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};