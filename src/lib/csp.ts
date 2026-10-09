// Hosts the browser is allowed to talk to. Anything not listed here is blocked, so an injected script cannot send data elsewhere.
// Add a new vendor here (or put extra origins in CSP_CONNECT_EXTRA, space separated) before using it from client code.
const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).host : undefined;
  } catch {
    return undefined;
  }
};
export function connectSrc() {
  const convexHost = hostOf(process.env.NEXT_PUBLIC_CONVEX_URL);
  const livekitHost = hostOf(process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace(/^wss?:/, "https:"));
  const isDev = process.env.NODE_ENV !== "production";
  return [
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
}

