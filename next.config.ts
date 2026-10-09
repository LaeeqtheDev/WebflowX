import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Scripts stay on this origin (Next.js needs inline bootstrap scripts, so
// 'unsafe-inline' remains; 'unsafe-eval' is dev only). Network calls are limited to the vendors listed in connectSrc (Convex, Liveblocks,
// LiveKit, Deepgram). Only North Foundry's own sites can frame the app (the WebflowX preview on northfoundry.co);
// nothing else can, and nothing can load plugins or change the base URL / form targets.
// Hosts the browser is allowed to talk to. Anything not listed here is blocked, so an injected script cannot send data elsewhere.
// Add a new vendor here (or put extra origins in CSP_CONNECT_EXTRA, space separated) before using it from client code.
const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).host : undefined;
  } catch {
    return undefined;
  }
};
const convexHost = hostOf(process.env.NEXT_PUBLIC_CONVEX_URL);
const livekitHost = hostOf(process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace(/^wss?:/, "https:"));
const connectSrc = [
  "'self'",
  "https://*.convex.cloud", "wss://*.convex.cloud", "https://*.convex.site",
  ...(convexHost ? [`https://${convexHost}`, `wss://${convexHost}`] : []),
  "https://*.liveblocks.io", "wss://*.liveblocks.io",
  "https://*.livekit.cloud", "wss://*.livekit.cloud",
  ...(livekitHost ? [`https://${livekitHost}`, `wss://${livekitHost}`] : []),
  "https://api.deepgram.com", "wss://api.deepgram.com",
  "https://vitals.vercel-insights.com",
  ...(process.env.CSP_CONNECT_EXTRA ? process.env.CSP_CONNECT_EXTRA.split(/\s+/).filter(Boolean) : []),
  ...(isDev ? ["ws:", "http://localhost:*"] : []),
].join(" ");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
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
  { key: "Content-Security-Policy", value: csp },
  // (X-Frame-Options can't name an allowed site, so framing is controlled by CSP frame-ancestors above)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera, microphone and screen sharing are needed for meetings; everything else is off
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
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
