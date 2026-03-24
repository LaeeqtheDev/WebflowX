"use client"

import { useGetChannel } from "@/features/channels/api/use-get-channel";
import { useChannelId } from "@/hooks/use-channel-id";
import { Loader, TriangleAlert, TriangleAlertIcon } from "lucide-react";
import { Header } from "../../components/header";
import { ChatInput } from "../../components/Chat-Input";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { MessageList } from "../../components/message-list";

const channelIdPage = () => {
    const channelId = useChannelId();

    const {results, status, loadMore} = useGetMessages({channelId})
    const {data: channel, isLoading: channelLoading} = useGetChannel({id: channelId})

    if(channelLoading || status === "LoadingFirstPage") 
    return(
        <div className="h-full flex-1 flex items-center justify-center">
            <Loader className="animate-spin size-5 text-[#ff5018]"/>

        </div>

        ) 


        if( !channel) 
        return(
            <div className="h-full flex-1 flex flex-col gap-y-2 items-center justify-center">
                <TriangleAlert className="size-5 text-[#ff5018]"/>
                <span className="text-sm text-muted-foreground">
                    Channel not found
                </span>
            </div>
    
            ) 
    


    return(
        
        <div className="flex flex-col h-full">
            <Header title={channel.name}/>
            <MessageList
            channelName={channel.name}
            channelCreationTime={channel._creationTime}
            data={results}
            loadMore={loadMore}
            isLoadingMore={status === "LoadingMore"}
            canLoadMore={status === "CanLoadMore"}
            />
            <ChatInput placeholder={`Message #${channel.name}`} />

           
         
        </div>
    )
}

export default channelIdPage;