import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://webflowx.northfoundry.co";
const SITE_DESCRIPTION =
  "WebflowX brings team chat, tasks, real-time docs and spreadsheets, video meetings with live transcripts and AI summaries into one workspace, with roles, permissions and data export. Built by North Foundry.";

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
    "role-based permissions",
    "audit log",
    "collaborative spreadsheets",
    "meeting transcripts",
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
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "WebflowX", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#381d2a",
  width: "device-width",
  initialScale: 1,
  // the on-screen keyboard shrinks the page instead of covering the bottom of it
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SpeedInsights />
        {children}
      </body>
    </html>
  );
}
