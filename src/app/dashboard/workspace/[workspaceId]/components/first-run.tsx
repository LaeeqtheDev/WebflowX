"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import type { ComponentType } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { Check, ChevronRight, Hash, MessageCircle, UserPlus, X } from "lucide-react"
import { api } from "../../../../../../convex/_generated/api"
import { cn } from "@/lib/utils"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { usePermissions } from "@/hooks/use-permissions"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal"
import { InviteModal } from "./inviteModal"
import { cleanChannelName } from "./channel-icon"

type IconLike = ComponentType<{ className?: string }>

/* ------------------------------------------------------------------ */
/* Invite dialog wired to the current workspace                         */
/* ------------------------------------------------------------------ */

const useInviteDialog = () => {
    const workspaceId = useWorkspaceId()
    const perms = usePermissions()
    const { data: workspace } = useGetWorkspace({ id: workspaceId })
    const [open, setOpen] = useState(false)
    const dialog = workspace ? (
        <InviteModal
            open={open}
            setOpen={setOpen}
            name={workspace.name}
            joinCode={workspace.joinCode}
            joinCodeExpiresAt={workspace.joinCodeExpiresAt}
            invitesDisabled={workspace.invitesDisabled}
   openInviteLink={workspace.openInviteLink}
            isAdmin={perms.can("invite")}
        />
    ) : null
    return { openInvite: () => setOpen(true), dialog, workspace }
}

/* ------------------------------------------------------------------ */
/* Channel empty state                                                  */
/* ------------------------------------------------------------------ */

const ActionRow = ({ icon: Icon, title, description, onClick }: {
    icon: IconLike
    title: string
    description: string
    onClick: () => void
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-plum/12 bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-brand/40 hover:bg-cream-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
    >
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-orange-ink">
            <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tracking-tight text-ink">{title}</span>
            <span className="block text-[13px] leading-snug text-ink/65">{description}</span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/40 transition-transform group-hover:translate-x-0.5" />
    </button>
)

const focusEditor = () => {
    document.querySelector<HTMLElement>("[data-chat-input] .ql-editor")?.focus()
}

export const ChannelWelcome = ({ channelName, canPost }: { channelName: string; canPost: boolean }) => {
    const perms = usePermissions()
    const [, setCreateChannelOpen] = useCreateChannelModal()
    const { openInvite, dialog } = useInviteDialog()

    const canInvite = perms.can("invite")
    const canCreate = perms.can("createChannels")
    if (!canInvite && !canCreate && !canPost) return null

    return (
        <section aria-label="Getting started" className="mx-3 mb-4 mt-2 max-w-xl rounded-2xl border border-plum/12 bg-cream p-4 md:mx-5">
            {dialog}
            <h2 className="text-lg font-semibold tracking-tight text-ink">
                Welcome to #{cleanChannelName(channelName)}
            </h2>
            <p className="mt-1 text-sm text-ink/70">It&apos;s quiet in here. A few good ways to get things started:</p>
            <div className="mt-3 flex flex-col gap-2">
                {canInvite && (
                    <ActionRow icon={UserPlus} title="Invite teammates" description="Share a link or code so your team can join." onClick={openInvite} />
                )}
                {canCreate && (
                    <ActionRow icon={Hash} title="Create a channel" description="Give each topic or project its own space." onClick={() => setCreateChannelOpen(true)} />
                )}
                {canPost && (
                    <ActionRow icon={MessageCircle} title="Say hello" description="Post the first message in this channel." onClick={focusEditor} />
                )}
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ */
/* "Get started" checklist (admins and owners)                          */
/* ------------------------------------------------------------------ */

const EVENT = "wfx:get-started"
const storageKey = (workspaceId: string) => `wfx:get-started-dismissed:${workspaceId}`

const subscribe = (cb: () => void) => {
    window.addEventListener(EVENT, cb)
    window.addEventListener("storage", cb)
    return () => {
        window.removeEventListener(EVENT, cb)
        window.removeEventListener("storage", cb)
    }
}

const readDismissed = (workspaceId: string) => {
    try { return window.localStorage.getItem(storageKey(workspaceId)) === "1" } catch { return false }
}

export const useGetStarted = () => {
    const workspaceId = useWorkspaceId()
    const perms = usePermissions()
    // Hidden on the server and until storage has been read, so it never flashes.
    const dismissed = useSyncExternalStore(subscribe, () => readDismissed(workspaceId), () => true)

    const enabled = perms.isAdmin && !dismissed
    const members = useQuery(api.members.get, enabled ? { workspaceId } : "skip")
    const channels = useQuery(api.channels.get, enabled ? { workspaceId } : "skip")
    const docs = useQuery(api.docs.get, enabled ? { workspaceId } : "skip")
    const meetings = useQuery(api.meetings.get, enabled ? { workspaceId } : "skip")

    const loaded = members !== undefined && channels !== undefined && docs !== undefined && meetings !== undefined
    const steps = {
        invite: (members?.length ?? 0) > 1,
        channel: (channels?.length ?? 0) > 1,
        build: (docs?.length ?? 0) > 0 || (meetings?.length ?? 0) > 0,
    }
    const doneCount = Number(steps.invite) + Number(steps.channel) + Number(steps.build)

    const dismiss = useCallback(() => {
        try { window.localStorage.setItem(storageKey(workspaceId), "1") } catch { /* storage unavailable: hide for this session only */ }
        window.dispatchEvent(new Event(EVENT))
    }, [workspaceId])

    // `ready` = we know whether to show it; `show` = admin, not dismissed, not finished
    const ready = !perms.isLoading && (!enabled || loaded)
    return { ready, show: ready && enabled && doneCount < 3, steps, doneCount, dismiss }
}

const Step = ({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) => (
    <li className="flex min-h-12 items-center gap-3 rounded-xl bg-surface px-3 py-2 ring-1 ring-plum/10">
        <span
            aria-hidden
            className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                done ? "border-brand bg-brand text-white" : "border-plum/25"
            )}
        >
            {done && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
            <span className={cn("block text-sm font-semibold tracking-tight", done ? "text-ink/60" : "text-ink")}>
                {title}
                <span className="sr-only">{done ? " (done)" : " (to do)"}</span>
            </span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{children}</span>
    </li>
)

const pill = "inline-flex h-10 items-center rounded-lg border border-plum/15 bg-cream-soft px-3 text-[13px] font-semibold text-orange-ink transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 md:h-8"

export const GetStartedCard = () => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const [, setCreateChannelOpen] = useCreateChannelModal()
    const { openInvite, dialog } = useInviteDialog()
    const { show, steps, doneCount, dismiss } = useGetStarted()

    if (!show) return null

    return (
        <section aria-label="Get started" className="w-full rounded-2xl border border-plum/12 bg-cream p-4">
            {dialog}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-ink">Get started</h2>
                    <p className="mt-0.5 text-[13px] text-ink/65">{doneCount} of 3 done</p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss get started checklist"
                    className="-mr-1 -mt-1 flex size-10 items-center justify-center rounded-lg text-ink/60 transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
                >
                    <X className="size-4" />
                </button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-plum/10" aria-hidden>
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(doneCount / 3) * 100}%` }} />
            </div>
            <ul className="mt-3 flex flex-col gap-2">
                <Step done={steps.invite} title="Invite a teammate">
                    <button type="button" className={pill} onClick={openInvite}>Invite</button>
                </Step>
                <Step done={steps.channel} title="Create a channel">
                    <button type="button" className={pill} onClick={() => setCreateChannelOpen(true)}>New channel</button>
                </Step>
                <Step done={steps.build} title="Start a meeting or create a doc">
                    <button type="button" className={pill} onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}>Doc</button>
                    <button type="button" className={pill} onClick={() => router.push(`/dashboard/workspace/${workspaceId}/meeting`)}>Meeting</button>
                </Step>
            </ul>
        </section>
    )
}
