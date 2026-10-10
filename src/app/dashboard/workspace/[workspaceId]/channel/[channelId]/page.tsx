"use client"

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { forgetLocation, rememberLocation } from "@/lib/last-location";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { recallMessages, rememberMessages } from "@/lib/message-cache";
import { useGetChannel } from "@/features/channels/api/use-get-channel";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useChannelId } from "@/hooks/use-channel-id";
import { Loader, Megaphone, TriangleAlert } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { cleanChannelName } from "../../components/channel-icon";
import { Header } from "../../components/header";
import { ChatInput } from "../../components/Chat-Input";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { MessageList } from "../../components/message-list";
import { ChannelWelcome } from "../../components/first-run";

const ChannelView = ({ channelId }: { channelId: Id<"channels"> }) => {

    const workspaceId = useWorkspaceId()
    const {results: live, status, loadMore} = useGetMessages({channelId})
    const {data: fetched, isLoading: fetchedLoading} = useGetChannel({id: channelId})
    // The sidebar already has every channel's name: use it so the page can draw before this channel's own query returns.
    const {data: channels} = useGetChannels({workspaceId})
    const fromList = channels?.find((c) => c._id === channelId)
    const channel = fetched ?? fromList
    const channelLoading = fetchedLoading && !fromList
    const perms = usePermissions()
    const pathname = usePathname()
    // On a return visit show what was there last time while the fresh list is on its way.
    const firstPage = status === "LoadingFirstPage"
    const results = firstPage ? recallMessages<typeof live[number]>(channelId) ?? [] : live
    useEffect(() => { if (!firstPage) rememberMessages(channelId, live) }, [firstPage, live, channelId])
    const found = !!channel
    useEffect(() => {
        if (channelLoading) return
        if (found) rememberLocation(pathname)
        else forgetLocation()
    }, [found, channelLoading, pathname])

    if(channelLoading) 
    return(
        <div className="h-full flex-1 flex items-center justify-center bg-cream-soft">
            <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                <Loader className="animate-spin size-6 text-brand"/>
            </div>

        </div>

        ) 


        if( !channel) 
        return(
            <div className="h-full flex-1 flex flex-col gap-y-3 items-center justify-center bg-cream-soft">
                <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                    <TriangleAlert className="size-6 text-brand"/>
                </div>
                <span className="font-semibold tracking-tight text-ink">
                    Channel not found
                </span>
                <Link href={`/dashboard/workspace/${workspaceId}`} className="text-sm font-semibold text-orange-ink hover:underline">
                    Back to workspace
                </Link>
            </div>
    
            ) 
    


    return(
        
        <div className="flex flex-col h-full min-h-0">
            <Header title={channel.name}/>
            <MessageList
            channelName={channel.name}
            channelCreationTime={channel._creationTime}
            data={results}
            loading={firstPage && results.length === 0}
            loadMore={loadMore}
            isLoadingMore={status === "LoadingMore"}
            canLoadMore={status === "CanLoadMore"}
            emptyState={<ChannelWelcome channelName={channel.name} canPost={!channel.readOnly || perms.can("postInReadOnly")} />}
            />
            {channel.readOnly && !perms.can("postInReadOnly") ? (
                <div className="mx-3 md:mx-5 mb-5 flex items-center gap-2.5 rounded-xl border border-plum/12 bg-surface px-4 py-3 text-sm text-ink/65">
                    <Megaphone className="size-4 shrink-0 text-brand" />
                    This is an announcement channel. Only admins and allowed roles can post. You can still reply in threads and react.
                </div>
            ) : (
                <ChatInput placeholder={`Message ${cleanChannelName(channel.name)}`} />
            )}

           
         
        </div>
    )
}

// keyed by channel, so switching channels in place starts each one fresh (editor text, open menus, scroll position)
const ChannelIdPage = () => {
    const channelId = useChannelId();
    return <ChannelView key={channelId} channelId={channelId} />;
};

export default ChannelIdPage;