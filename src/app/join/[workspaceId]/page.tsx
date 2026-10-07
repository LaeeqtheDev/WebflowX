"use client"

import { Button } from "@/components/ui/button";
import { useGetWorkspaceInfo } from "@/features/workspaces/api/use-get-workspace-info";
import { useJoin } from "@/features/workspaces/api/use-join";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/lib/error-message"
import { parseLimitError } from "@/lib/plans";
import VerificationInput from 'react-verification-input'
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";

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
            router.push(`/dashboard/workspace/${workspaceId}`)
        }
    }, [isMember, router, workspaceId])

    const [joinError, setJoinError] = useState<string | null>(null)

    const tryJoin = useCallback((code: string) => {
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
        if (codeFromUrl && isAuthenticated && !isLoading && !isMember && !hasAutoJoined.current) {
            hasAutoJoined.current = true
            tryJoin(codeFromUrl)
        }
    }, [codeFromUrl, isAuthenticated, isLoading, isMember, tryJoin])

    const handleComplete = (value: string) => {
        setJoinError(null)
        tryJoin(value)
    }

    if (isLoading || isPending) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader className="size-6 animate-spin text-[#ff5018]" />
            </div>
        )
    }

    // Not signed in yet: show the invite, and send them to sign up / log in, then straight back here to join.
    if (!isAuthenticated) {
        if (urlCode) { try { window.sessionStorage.setItem(storageKey, urlCode) } catch { /* private mode */ } }
        const back = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
        return (
            <div className="h-full flex flex-col gap-y-8 items-center justify-center p-8">
                <Image src={"/logo.png"} width={60} height={60} alt="WebflowX" />
                <div className="flex max-w-md flex-col items-center gap-y-2 text-center">
                    <h1 className="text-2xl font-bold">
                        {data ? `You're invited to join ${data.name}` : "This invite link isn't valid"}
                    </h1>
                    <p className="text-md text-muted-foreground">
                        {data
                            ? data.invitesOpen === false
                                ? "Invites are closed or the code has expired. Ask an admin for a new invite."
                                : "Create a free account (or log in) and you'll be added to the workspace automatically."
                            : "Ask the person who invited you to send a new link."}
                    </p>
                </div>
                {data && data.invitesOpen !== false && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button size="lg" asChild>
                            <Link href={`/auth?mode=signup&next=${back}`}>Create account</Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href={`/auth?next=${back}`}>I already have an account</Link>
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col gap-y-8 items-center justify-center p-8">
            <div className="absolute -top-32 -left-32 w-125 h-125 bg-linear-to-br from-orange-500 to-[#b5b399] rounded-full opacity-40 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 w-150 h-150 bg-linear-to-br from-orange-500 to-[#d8da72] rounded-full opacity-30 blur-3xl" />
            <Image src={"/logo.png"} width={60} height={60} alt="WebflowX" />
            <div className="flex flex-col gap-y-4 items-center justify-center max-w-md">
                <div className="flex flex-col gap-y-2 items-center justify-center">
                    <h1 className="text-2xl font-bold">
                        Join {data?.name}&apos;s workspace
                    </h1>
                    <p className="text-md text-muted-foreground">
                        {data?.invitesOpen === false
                            ? "Invites are closed or the code has expired. Ask an admin for a new invite."
                            : "Enter the workspace code to join"}
                    </p>
                    {joinError && (
                        <p role="alert" className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {joinError}
                        </p>
                    )}
                </div>
                <VerificationInput
                    length={6}
                    classNames={{
                        container: "flex gap-x-2",
                        character: "w-12 h-12 rounded-md border !border-gray-300 flex items-center justify-center text-lg font-medium !text-[#c2370d] !bg-white",
                    }}
                    autoFocus
                    inputProps={{ "aria-label": "Workspace join code" }}
                    onComplete={handleComplete}
                />
            </div>
            <div className="flex gap-x-4">
                <Button size={"lg"} asChild>
                    <Link href={"/"}>Back to home</Link>
                </Button>
            </div>
        </div>
    )
}

export default JoinPage;