import type { Metadata } from "next"
import { GuestJoin } from "./guest-join"

export const metadata: Metadata = {
  title: "Join meeting",
  robots: { index: false, follow: false },
}

// Public join page for a meeting's join link: no account needed.
export default async function JoinByLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <GuestJoin token={token} />
}
