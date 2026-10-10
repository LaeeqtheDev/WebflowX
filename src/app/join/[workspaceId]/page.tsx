"use client"

import { Button } from "@/components/ui/button";
import { useGetWorkspaceInfo } from "@/features/workspaces/api/use-get-workspace-info";
import { useJoin } from "@/features/workspaces/api/use-join";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { ArrowLeft, Loader, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/lib/error-message"
import { parseLimitError } from "@/lib/plans";
import VerificationInput from 'react-verification-input'
import { toast } from "sonner";
import { AuthShell } from "@/features/auth/components/auth-screen";
import { useConvexAuth } from "convex/react";

// Same split layout as the sign-in screen: plum brand panel on the left, cream form panel on the right.
const primary =
    "h-12 w-full cursor-pointer rounded-xl bg-[#ff5018] text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(255,80,24,0.8)] hover:bg-[#e6430f]"

const Heading = ({ title, text }: { title: string; text: string }) => (
    <>
        <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
        <p className="mt-2 text-[15px] text-ink/65">{text}</p>
    </>
)

const CodeInput = ({ onComplete }: { onComplete: (v: string) => void }) => (
    <VerificationInput
        length={6}
        classNames={{
            container: "flex gap-x-2",
            character: "size-10 sm:size-12 rounded-xl border !border-plum/20 flex items-center justify-center text-lg font-semibold !text-orange-ink !bg-surface",
            characterSelected: "!border-[#ff5018]",
        }}
        autoFocus
        inputProps={{ "aria-label": "Workspace join code" }}
        onComplete={onComplete}
    />
)

const JoinPage = () => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const searchParams = useSearchParams()
    // The code is remembered while the visitor signs up, so it survives the trip through /auth.
    const storageKey = `wfx-invite-${workspaceId}`
    const urlCode = searchParams.get("code")
    const codeFromUrl = urlCode ?? (() => {
        try { return window.sessionStorage.getItem(storageKey) } catch { return null }
    })()
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
    const { data, isLoading: infoLoading } = useGetWorkspaceInfo({ id: workspaceId })
    const isLoading = infoLoading || authLoading
    const { mutate, isPending } = useJoin()
    const hasAutoJoined = useRef(false)

    const isMember = useMemo(() => data?.isMember, [data])

    // Redirect if already a member
    useEffect(() => {
        if (isMember) {
            router.replace(`/dashboard/workspace/${workspaceId}`)
        }
    }, [isMember, router, workspaceId])

    const [joinError, setJoinError] = useState<string | null>(null)
    const [typedCode, setTypedCode] = useState<string | null>(null)

    const tryJoin = useCallback((code?: string) => {
        mutate({ joinCode: code, workspaceId }, {
            onSuccess: (id) => {
                try { window.sessionStorage.removeItem(`wfx-invite-${workspaceId}`) } catch { /* ignore */ }
                router.replace(`/dashboard/workspace/${id}`)
                toast.success("Successfully joined workspace")
            },
            onError: (e) => {
                const message = errorMessage(e)
                // The joiner can't upgrade someone else's workspace, so explain inline (no upgrade dialog)
                const limit = parseLimitError(message)
                setJoinError(
                    limit
                        ? `This workspace has used all ${limit.limit} member seats on its plan. Ask an admin to upgrade it, then try again.`
                        : message.length > 0 && !/server error/i.test(message)
                            ? message
                            : "We couldn't add you to this workspace. Check the code and try again."
                )
            }
        })
    }, [mutate, workspaceId, router])

    // Auto join if the invite link carries the code. Runs once; a failure is shown instead of retried.
    useEffect(() => {
        if ((codeFromUrl || data?.openLink) && isAuthenticated && !isLoading && !isMember && !hasAutoJoined.current) {
            hasAutoJoined.current = true
            tryJoin(codeFromUrl ?? undefined)
        }
    }, [codeFromUrl, data?.openLink, isAuthenticated, isLoading, isMember, tryJoin])

    // "Open link" workspaces need no code: send signed-out visitors straight to sign-up and come back here.
    const openForVisitors = !isLoading && !isAuthenticated && !!data?.openLink && data.invitesOpen !== false
    useEffect(() => {
        if (openForVisitors) router.replace(`/auth?mode=signup&next=${encodeURIComponent(`/join/${workspaceId}`)}`)
    }, [openForVisitors, router, workspaceId])

    const handleComplete = (value: string) => {
        setJoinError(null)
        tryJoin(value)
    }

    const wsName = data?.name
    const panelTitle = wsName ? `Join ${wsName} on WebflowX.` : "Join your team on WebflowX."
    const panelBody = "Messaging, tasks, documents, meetings and AI summaries in one place."

    // Signed in, or deciding: working out who you are, or adding you to the workspace.
    if (isLoading || isPending || (isAuthenticated && (codeFromUrl || data?.openLink) && !joinError) || openForVisitors) {
        return (
            <AuthShell title={panelTitle} body={panelBody}>
                <Loader className="size-7 animate-spin text-[#ff5018]" />
                <h1 className="mt-5 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
                    {isLoading ? "One moment…" : "Adding you to the workspace…"}
                </h1>
                <p className="mt-2 text-[15px] text-ink/65">You&apos;ll land in {wsName ?? "your workspace"} in a second.</p>
            </AuthShell>
        )
    }

    // Not signed in and no usable link: ask for the code once, then sign up.
    if (!isAuthenticated) {
        const inviteCode = urlCode ?? typedCode ?? codeFromUrl
        if (inviteCode) { try { window.sessionStorage.setItem(storageKey, inviteCode) } catch { /* private mode */ } }
        const back = encodeURIComponent(`${window.location.pathname}${inviteCode ? `?code=${encodeURIComponent(inviteCode)}` : ""}`)
        const closed = data?.invitesOpen === false
        return (
            <AuthShell title={panelTitle} body={panelBody}>
                <Link href="/" className="mb-10 inline-flex items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-ink">
                    <ArrowLeft size={16} /> Back to home
                </Link>
                <Heading
                    title={data ? `Join ${wsName}` : "This invite link isn't valid"}
                    text={
                        !data
                            ? "Ask the person who invited you for a new link."
                            : closed
                                ? "Invites are closed or the code has expired. Ask an admin for a new invite."
                                : inviteCode
                                    ? "Create a free account, or log in, and you'll be added automatically."
                                    : "This link is missing its invite code. Enter the 6-character code from your invite, then create your account."
                    }
                />
                {data && !closed && !inviteCode && (
                    <div className="mt-8">
                        <CodeInput onComplete={(v) => setTypedCode(v)} />
                        <p className="mt-5 text-sm text-ink/60">No code? Ask whoever invited you to copy the link again from <strong className="text-ink/75">Invite people</strong>. The full link ends in <code className="rounded bg-cream-deep px-1">?code=XXXXXX</code> and signs you up without typing anything.</p>
                    </div>
                )}
                {data && !closed && !!inviteCode && (
                    <div className="mt-8 space-y-3">
                        <Button asChild size="lg" className={primary}>
                            <Link href={`/auth?mode=signup&next=${back}`}>Create account and join</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-plum/15 bg-surface text-[15px] font-semibold text-ink hover:bg-cream">
                            <Link href={`/auth?next=${back}`}>I already have an account</Link>
                        </Button>
                    </div>
                )}
            </AuthShell>
        )
    }

    // Signed in but the code is missing or was rejected.
    return (
        <AuthShell title={panelTitle} body={panelBody}>
            <Heading
                title={`Join ${wsName ?? "workspace"}`}
                text={data?.invitesOpen === false ? "Invites are closed or the code has expired. Ask an admin for a new invite." : "Enter the workspace code to join."}
            />
            {joinError && (
                <div role="alert" className="mt-6 flex items-start gap-x-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <p className="break-words">{joinError}</p>
                </div>
            )}
            <div className="mt-8"><CodeInput onComplete={handleComplete} /></div>
            <Link href="/dashboard" className="mt-8 inline-flex items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-ink">
                <ArrowLeft size={16} /> Back to dashboard
            </Link>
        </AuthShell>
    )
}

export default JoinPage;
