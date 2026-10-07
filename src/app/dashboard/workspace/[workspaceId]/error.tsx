"use client"

import { RouteError } from "@/components/states/route-error"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} variant="panel" />
}
