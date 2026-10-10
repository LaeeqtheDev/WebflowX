import { NextResponse, NextRequest, type NextFetchEvent } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
} from "@convex-dev/auth/nextjs/server";
import { safeNext } from "@/lib/safe-next";
import { connectSrc } from "@/lib/csp";

const isPublicPage = createRouteMatcher(["/", "/auth", "/join"])

// legal pages, newsletter confirm/unsubscribe links and invite links are public for everyone, signed in or not
const isLegal = createRouteMatcher(["/terms", "/privacy", "/security", "/trust", "/dpa", "/subprocessors", "/templates", "/changelog", "/case-studies(.*)", "/features(.*)", "/use-cases(.*)", "/compare(.*)", "/join/(.*)", "/newsletter/(.*)"])

const isApi = createRouteMatcher(["/api/(.*)"])

// uptime monitors call this without signing in
const isHealth = createRouteMatcher(["/api/health"])

// The signed-in app, sign-in and invite pages are rendered per request, so they get a strict nonce-based CSP:
// only scripts that carry this request's nonce (and scripts those load) can run, so injected inline script is blocked.
// The static marketing pages keep the looser policy from next.config.ts, because a per-request nonce would force them dynamic.
const needsNonce = (path: string) => /^\/(dashboard|auth|join)(\/|$)/.test(path)

const isDev = process.env.NODE_ENV !== "production"

function appCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc()}`,
    "worker-src 'self' blob:",
    "frame-src https://*.convex.cloud",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://northfoundry.co https://*.northfoundry.co",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ")
}

const mw = convexAuthNextjsMiddleware(async (request) => {
  const isInvite = request.nextUrl.pathname.startsWith("/join/");
  if ((isLegal(request) || isHealth(request)) && !isInvite) return undefined;

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

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname
  if (!needsNonce(path)) return mw(request, event)

  const nonce = btoa(crypto.randomUUID())
  const csp = appCsp(nonce)
  // Next.js reads the nonce from the request's CSP header and stamps it on its own inline scripts.
  const headers = new Headers(request.headers)
  headers.set("content-security-policy", csp)
  headers.set("x-nonce", nonce)
  const forwarded = new NextRequest(request, { headers })

  const res = (await mw(forwarded, event)) as Response | undefined | void
  if (!res) {
    const next = NextResponse.next({ request: { headers } })
    next.headers.set("content-security-policy", csp)
    return next
  }
  res.headers.set("content-security-policy", csp)
  return res
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};