import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Define public pages (like login)
const isPublicPage = createRouteMatcher(["/auth"]);

export default convexAuthNextjsMiddleware(async (request) => {
  // Await the authentication check
  const authenticated = await isAuthenticatedNextjs(request as any);

  // Redirect unauthenticated users from protected pages
  if (!isPublicPage(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request as any, "/auth");
  }

  // Redirect authenticated users away from public pages (login)
  if (isPublicPage(request) && authenticated) {
    return nextjsMiddlewareRedirect(request as any, "/");
  }

  // Allow the request to continue
  return undefined;
});

export const config = {
  // Middleware applies to all routes except static assets and Next.js internals
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
 