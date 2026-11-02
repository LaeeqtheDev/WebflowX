"use client"

import { useEffect } from "react"
import { savePlanIntent } from "@/lib/plan-intent"

export const PlanIntent = ({ plan }: { plan?: string }) => {
  useEffect(() => savePlanIntent(plan), [plan])
  return null
}
