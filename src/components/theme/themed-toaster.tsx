"use client"
import { Toaster } from "sonner"
import { useIsDark } from "@/hooks/use-theme-pref"

export const ThemedToaster = () => <Toaster theme={useIsDark() ? "dark" : "light"} />
