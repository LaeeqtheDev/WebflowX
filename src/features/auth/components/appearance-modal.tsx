"use client"
import { useState } from "react"
import { Check, Monitor, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSetLook, useSetTheme } from "@/hooks/use-theme-pref"
import { errMsg } from "@/lib/errors"
import { setDataSaverPref, useDataSaverPref, useLowData } from "@/hooks/use-low-data"
import type { DataSaverPref } from "@/lib/network"
import {
    ACCENT_META, DEFAULT_LOOK, THEME_META, isLook, isThemePref,
    type ConcreteTheme, type Look, type ThemePref,
} from "@/lib/theme"
import { ACCENT_IDS, FONT_SCALES } from "../../../../convex/appearanceDefs"
import type { Doc } from "../../../../convex/_generated/dataModel"

const SIZE_LABEL: Record<number, string> = { 90: "Small", 100: "Default", 112: "Large", 125: "Largest" }
const THEME_ORDER: ConcreteTheme[] = ["light", "snow", "dark", "ash", "midnight", "forest", "onyx"]

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
    <section className="space-y-3">
        <div>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {hint && <p className="text-xs text-ink/60">{hint}</p>}
        </div>
        {children}
    </section>
)

const segment = (active: boolean) =>
    `flex-1 cursor-pointer rounded-md px-3 py-2 text-xs font-medium transition-colors ${active ? "bg-brand text-white shadow-sm" : "text-ink/70 hover:bg-ink/10 hover:text-ink"}`

// Discord-style appearance: theme, accent colour, message density, text size and reduced motion.
// Every change shows instantly, then is saved to the account so it follows the member across devices.
export const AppearanceModal = ({ open, setOpen, user }: { open: boolean; setOpen: (o: boolean) => void; user: Doc<"users"> }) => (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Appearance</DialogTitle>
                <DialogDescription>Only you see these. They follow you to any device you sign in on.</DialogDescription>
            </DialogHeader>
            <AppearanceBody user={user} />
        </DialogContent>
    </Dialog>
)

// Starts from the saved values each time the dialog opens, and keeps its own copy while open so quick
// successive clicks build on each other instead of on a value that has not come back from the server yet.
const AppearanceBody = ({ user }: { user: Doc<"users"> }) => {
    const setTheme = useSetTheme()
    const setLook = useSetLook()
    const [theme, setThemeState] = useState<ThemePref>(isThemePref(user.theme) ? user.theme : "system")
    const [look, setLookState] = useState<Look>(isLook(user.look) ? user.look : DEFAULT_LOOK)
    const saver = useDataSaverPref()
    const lowNow = useLowData()
    const fail = (e: unknown) => toast.error(errMsg(e, "Couldn't save your appearance"))
    const pickTheme = (t: ThemePref) => { setThemeState(t); setTheme(t).catch(fail) }
    const patch = (p: Partial<Look>) => { const next = { ...look, ...p }; setLookState(next); setLook(next).catch(fail) }

    return (
                <div className="space-y-7 pb-1">
                    <Section title="Theme">
                        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <button
                                type="button" role="radio" aria-checked={theme === "system"}
                                onClick={() => pickTheme("system")}
                                className={`flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium ${theme === "system" ? "border-brand bg-brand/10 text-ink" : "border-ink/15 text-ink/70 hover:border-ink/30"}`}
                            >
                                <Monitor className="size-4" aria-hidden /> Sync with computer
                            </button>
                            {THEME_ORDER.map((id) => {
                                const m = THEME_META[id]
                                const active = theme === id
                                return (
                                    <button
                                        key={id} type="button" role="radio" aria-checked={active} aria-label={`${m.label}, ${m.scheme}`}
                                        onClick={() => pickTheme(id)}
                                        className={`group relative overflow-hidden rounded-xl border text-left ${active ? "border-brand ring-1 ring-brand" : "border-ink/15 hover:border-ink/30"}`}
                                    >
                                        <span className="flex h-12" aria-hidden>
                                            <span className="w-1/4" style={{ background: m.swatch[2] }} />
                                            <span className="flex-1" style={{ background: m.swatch[0] }}>
                                                <span className="m-2 mt-3 block h-3 rounded-sm" style={{ background: m.swatch[1] }} />
                                            </span>
                                        </span>
                                        <span className="flex items-center justify-between bg-surface px-2 py-1.5 text-xs font-medium text-ink">
                                            {m.label}
                                            {active && <Check className="size-3.5 text-brand" aria-hidden />}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </Section>

                    <Section title="Accent color" hint="Buttons, links, highlights and your unread markers.">
                        <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2.5">
                            {ACCENT_IDS.map((id) => {
                                const a = ACCENT_META[id]
                                const active = look.accent === id
                                return (
                                    <button
                                        key={id} type="button" role="radio" aria-checked={active} aria-label={a.label} title={a.label}
                                        onClick={() => patch({ accent: id })}
                                        className={`flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition ${active ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-ink/30"}`}
                                        style={{ background: a.color }}
                                    >
                                        {active && <Check className="size-4 text-white" aria-hidden />}
                                    </button>
                                )
                            })}
                        </div>
                    </Section>

                    <Section title="Message display" hint="Compact fits more messages on screen.">
                        <div role="radiogroup" aria-label="Message display" className="flex gap-1 rounded-lg bg-ink/10 p-1">
                            {(["cozy", "compact"] as const).map((d) => (
                                <button key={d} type="button" role="radio" aria-checked={look.density === d} onClick={() => patch({ density: d })} className={segment(look.density === d)}>
                                    {d === "cozy" ? "Cozy" : "Compact"}
                                </button>
                            ))}
                        </div>
                        <div className="overflow-hidden rounded-lg border border-ink/10 bg-cream-soft py-2">
                            {[["Sam", "Standup moved to 10, recap before please."], ["Priya", "Done. I'll add it to the board."]].map(([who, text]) => (
                                <div key={who} className={`flex items-start gap-3 px-3 ${look.density === "compact" ? "py-0.5" : "py-2"}`}>
                                    <span className={`flex shrink-0 items-center justify-center rounded-md bg-avatar font-semibold text-white ${look.density === "compact" ? "size-6 text-xs" : "size-9 text-sm"}`}>{who[0]}</span>
                                    <p className="min-w-0 text-sm leading-snug text-ink"><span className="font-semibold">{who}</span>{look.density === "compact" ? " " : <br />}{text}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Text size">
                        <div role="radiogroup" aria-label="Text size" className="flex gap-1 rounded-lg bg-ink/10 p-1">
                            {FONT_SCALES.map((f) => (
                                <button key={f} type="button" role="radio" aria-checked={look.fontScale === f} onClick={() => patch({ fontScale: f })} className={segment(look.fontScale === f)}>
                                    {SIZE_LABEL[f]}
                                </button>
                            ))}
                        </div>
                    </Section>

                    <Section title="Data saver" hint={`Skips profile photos and waits to load images, and turns off animation. Auto follows your browser's data saver and slow connections.${saver === "auto" && lowNow ? " It is on right now." : ""}`}>
                        <div role="radiogroup" aria-label="Data saver" className="flex gap-1 rounded-lg bg-ink/10 p-1">
                            {(["auto", "on", "off"] as DataSaverPref[]).map((d) => (
                                <button key={d} type="button" role="radio" aria-checked={saver === d} onClick={() => setDataSaverPref(d)} className={segment(saver === d)}>
                                    {d === "auto" ? "Auto" : d === "on" ? "Always on" : "Off"}
                                </button>
                            ))}
                        </div>
                    </Section>

                    <Section title="Reduced motion" hint="Turns off animations and transitions.">
                        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                            <input type="checkbox" className="size-4 accent-[var(--wfx-accent)]" checked={look.reducedMotion} onChange={(e) => patch({ reducedMotion: e.target.checked })} />
                            Reduce motion
                        </label>
                    </Section>

                    <button
                        type="button"
                        onClick={() => { pickTheme("system"); setLookState(DEFAULT_LOOK); setLook(DEFAULT_LOOK).catch(fail) }}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-ink/65 hover:text-ink"
                    >
                        <RotateCcw className="size-3.5" aria-hidden /> Reset to defaults
                    </button>
                </div>
    )
}
