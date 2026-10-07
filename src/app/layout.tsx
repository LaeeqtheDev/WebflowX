import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Modals } from "@/components/Modals";
import { Toaster } from "sonner";
import { JotaiProvider } from "./dashboard/workspace/[workspaceId]/components/jotai-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://webflow-x.vercel.app";
const SITE_DESCRIPTION =
  "WebflowX brings team chat, docs, tasks, meetings and AI summaries into one workspace. Built by North Foundry.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "WebflowX: chat, docs, tasks and meetings in one workspace",
    template: "%s | WebflowX",
  },
  description: SITE_DESCRIPTION,
  applicationName: "WebflowX",
  keywords: [
    "team chat",
    "team workspace",
    "task management",
    "collaborative docs",
    "video meetings",
    "AI meeting summaries",
    "Slack alternative",
    "WebflowX",
    "North Foundry",
  ],
  authors: [{ name: "North Foundry", url: "https://northfoundry.co" }],
  creator: "North Foundry",
  publisher: "North Foundry",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "WebflowX",
    locale: "en_US",
    url: "/",
    title: "WebflowX: chat, docs, tasks and meetings in one workspace",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "WebflowX: chat, docs, tasks and meetings in one workspace",
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#381d2a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ConvexClientProvider>
            <JotaiProvider>
              <NuqsAdapter>
                <Toaster />
                <Modals />
                {children}
              </NuqsAdapter>
            </JotaiProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}