"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";

// For public pages (landing, newsletter links) that call a public Convex function without signing in.
// It carries no auth state, so those pages stay fully static and cacheable.
export function PublicConvexProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
