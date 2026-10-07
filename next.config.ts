import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Scripts stay on this origin (Next.js needs inline bootstrap scripts, so
// 'unsafe-inline' remains; 'unsafe-eval' is dev only). Network calls are limited to https/wss (Convex, Liveblocks,
// LiveKit, Deepgram). Nothing can frame the app, load plugins, or change the base URL / form targets.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https: wss:${isDev ? " ws: http://localhost:*" : ""}`,
  "worker-src 'self' blob:",
  // PDFs shared in chat can be previewed in place; they are served from Convex storage
  "frame-src https://*.convex.cloud",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
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
