import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
