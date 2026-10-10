import { clearAllDrafts } from "@/lib/network"
import { forgetLocation } from "@/lib/last-location"
import { translate, type Locale } from "@/lib/i18n"

// Signing out leaves the page mounted while every query starts answering "not signed in". Letting the app react to
// that (errors, redirects, screens fighting over where to go) looked like a freeze. So: cover the screen at once, clear
// the local copies, sign out, then load the sign-in page fresh so no old state survives.
export const signOutAndLeave = async (signOut: () => Promise<unknown>) => {
  if (typeof document !== "undefined" && !document.getElementById("wfx-signing-out")) {
    const cover = document.createElement("div")
    cover.id = "wfx-signing-out"
    cover.setAttribute("role", "status")
    cover.setAttribute("aria-live", "polite")
    // The page's own theme colours, so it matches light and dark (the app puts its tokens on <html>).
    cover.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--background,#fbf9f7);color:var(--foreground,#1b1017);font:500 15px var(--font-geist-sans),system-ui,sans-serif"
    const spin = document.createElement("span")
    spin.style.cssText = "width:18px;height:18px;border-radius:50%;border:2px solid currentColor;border-top-color:var(--wfx-accent,#ff5018);opacity:.7;animation:wfx-spin .8s linear infinite"
    const style = document.createElement("style")
    style.textContent = "@keyframes wfx-spin{to{transform:rotate(360deg)}}"
    let lang: Locale = "en"
    try { const v = window.localStorage.getItem("wfx:lang"); if (v) lang = v as Locale } catch { /* ignore */ }
    const label = document.createElement("span")
    label.textContent = translate(lang, "guide.signout")
    cover.append(style, spin, label)
    document.body.appendChild(cover)
  }
  clearAllDrafts()
  forgetLocation()
  try { await Promise.race([signOut(), new Promise((r) => setTimeout(r, 4000))]) } catch { /* leave anyway */ }
  window.location.assign("/auth")
}
