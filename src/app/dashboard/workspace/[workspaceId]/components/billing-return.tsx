"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

// Stripe sends people back with ?billing=success or ?billing=cancelled. Say so, then tidy the address bar.
export const BillingReturn = () => {
    const params = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const result = params.get("billing")

    useEffect(() => {
        if (!result) return
        if (result === "success") toast.success("Thanks! Your plan will be active in a few seconds.")
        else if (result === "cancelled") toast("Checkout cancelled. You haven't been charged.")
        router.replace(pathname)
    }, [result, router, pathname])

    return null
}
