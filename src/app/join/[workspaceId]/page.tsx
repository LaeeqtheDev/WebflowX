"use client"

import { Button } from "@/components/ui/button";
import { useGetWorkspaceInfo } from "@/features/workspaces/api/use-get-workspace-info";
import { useJoin } from "@/features/workspaces/api/use-join";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import VerificationInput from 'react-verification-input'
import { toast } from "sonner";

const JoinPage = () => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const searchParams = useSearchParams()
    const codeFromUrl = searchParams.get("code")
    const { data, isLoading } = useGetWorkspaceInfo({ id: workspaceId })
    const { mutate, isPending } = useJoin()
    const hasAutoJoined = useRef(false)

    const isMember = useMemo(() => data?.isMember, [data])

    // Redirect if already a member
    useEffect(() => {
        if (isMember) {
            router.push(`/dashboard/workspace/${workspaceId}`)
        }
    }, [isMember, router, workspaceId])

    // Auto join if code is in URL
    useEffect(() => {
        if (
            codeFromUrl &&
            !isLoading &&
            !isMember &&
            !hasAutoJoined.current &&
            !isPending
        ) {
            hasAutoJoined.current = true
            mutate({ joinCode: codeFromUrl, workspaceId }, {
                onSuccess: (id) => {
                    router.replace(`/dashboard/workspace/${id}`)
                    toast.success("Successfully joined workspace")
                },
                onError: () => {
                    toast.error("Failed to join workspace")
                    hasAutoJoined.current = false
                }
            })
        }
    }, [codeFromUrl, isLoading, isMember, isPending])

    const handleComplete = (value: string) => {
        mutate({ joinCode: value, workspaceId }, {
            onSuccess: (id) => {
                router.replace(`/dashboard/workspace/${id}`)
                toast.success("Successfully joined workspace")
            },
            onError: () => {
                toast.error("Failed to join Workspace")
            }
        })
    }

    if (isLoading || isPending) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader className="size-6 animate-spin text-[#ff5018]" />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col gap-y-8 items-center justify-center p-8">
            <div className="absolute -top-32 -left-32 w-125 h-125 bg-linear-to-br from-orange-500 to-[#b5b399] rounded-full opacity-40 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 w-150 h-150 bg-linear-to-br from-orange-500 to-[#d8da72] rounded-full opacity-30 blur-3xl" />
            <Image src={"/logo.png"} width={60} height={60} alt="logo" />
            <div className="flex flex-col gap-y-4 items-center justify-center max-w-md">
                <div className="flex flex-col gap-y-2 items-center justify-center">
                    <h1 className="text-2xl font-bold">
                        Join {data?.name}'s workspace
                    </h1>
                    <p className="text-md text-muted-foreground">
                        Enter the workspace code to join
                    </p>
                </div>
                <VerificationInput
                    length={6}
                    classNames={{
                        container: "flex gap-x-2",
                        character: "w-12 h-12 rounded-md border !border-gray-300 flex items-center justify-center text-lg font-medium !text-[#ff5018] !bg-white",
                    }}
                    autoFocus
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