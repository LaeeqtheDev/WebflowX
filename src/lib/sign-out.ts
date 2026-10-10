import { clearAllDrafts } from "@/lib/network"
import { forgetLocation } from "@/lib/last-location"

// Signing out leaves the page mounted while every query starts answering "not signed in". Letting the app react to
// that (errors, redirects, screens fighting over where to go) looked like a freeze. So: cover the screen at once, clear
// the local copies, sign out, then load the sign-in page fresh so no old state survives.
export const signOutAndLeave = async (signOut: () => Promise<unknown>) => {
  if (typeof document !== "undefined" && !document.getElementById("wfx-signing-out")) {
    const cover = document.createElement("div")
    cover.id = "wfx-signing-out"
    cover.setAttribute("role", "status")
    cover.setAttribute("aria-live", "polite")
    cover.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#22101a;color:#fff;font:500 15px system-ui,sans-serif"
    cover.textContent = "Signing out…"
    document.body.appendChild(cover)
  }
  clearAllDrafts()
  forgetLocation()
  try { await Promise.race([signOut(), new Promise((r) => setTimeout(r, 4000))]) } catch { /* leave anyway */ }
  window.location.assign("/auth")
}
