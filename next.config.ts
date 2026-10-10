import type { NextConfig } from "next";
import { connectSrc } from "./src/lib/csp";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Scripts stay on this origin (Next.js needs inline bootstrap scripts, so
// 'unsafe-inline' remains; 'unsafe-eval' is dev only). Network calls are limited to the vendors listed in connectSrc (Convex, Liveblocks,
// LiveKit, Deepgram). Only North Foundry's own sites can frame the app (the WebflowX preview on northfoundry.co);
// nothing else can, and nothing can load plugins or change the base URL / form targets.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc()}`,
  "worker-src 'self' blob:",
  // PDFs shared in chat can be previewed in place; they are served from Convex storage
  "frame-src https://*.convex.cloud",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://northfoundry.co https://*.northfoundry.co",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // (X-Frame-Options can't name an allowed site, so framing is controlled by CSP frame-ancestors above)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera, microphone and screen sharing are needed for meetings; everything else is off
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Once webflowx.northfoundry.co is live, set WFX_CANONICAL_HOST=webflowx.northfoundry.co on Vercel and the old
  // *.vercel.app address forwards there (same path), so old links, bookmarks and invites keep working.
  async redirects() {
    const host = process.env.WFX_CANONICAL_HOST
    if (!host) return []
    return [{ source: "/:path*", has: [{ type: "host" as const, value: "webflow-x.vercel.app" }], destination: `https://${host}/:path*`, permanent: false }]
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The signed-in app, sign-in and invite pages get a stricter per-request (nonce) policy from middleware.ts instead.
      { source: "/((?!(?:dashboard|auth|join)(?:/|$)).*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
      // the service worker must always be fetched fresh so updates roll out
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    // Keep visited / prefetched pages in the browser for a while so going back and forth between sections is instant
    // instead of waiting on a server round trip each time. Pages fetch their live data from Convex themselves.
    staleTimes: { dynamic: 60, static: 300 },
    // Only bundle the icons / helpers that are actually used.
    optimizePackageImports: [
      "lucide-react",
      "@fluentui/react-icons",
      "react-icons",
      "@tabler/icons-react",
      "date-fns",
      "radix-ui",
      "motion",
      "recharts",
      "react-use",
    ],
  },
  turbopack: {
    resolveAlias: {
      yjs: "./node_modules/yjs/dist/yjs.mjs"
    }
  }
};

export default nextConfig;
