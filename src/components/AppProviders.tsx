import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Modals } from "@/components/Modals";
import { ThemedToaster } from "@/components/theme/themed-toaster";
import { JotaiProvider } from "@/app/dashboard/workspace/[workspaceId]/components/jotai-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";

// Everything the signed-in app and the sign-in screens need. It reads the sign-in cookie, which makes the pages
// under it render per request. The public marketing pages deliberately do not use it, so they can be served static.
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        <JotaiProvider>
          <NuqsAdapter>
            <ThemedToaster />
            <Modals />
            {children}
          </NuqsAdapter>
        </JotaiProvider>
      </ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
