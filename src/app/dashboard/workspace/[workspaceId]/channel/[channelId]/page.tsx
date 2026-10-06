"use client"

import { useGetChannel } from "@/features/channels/api/use-get-channel";
import { useChannelId } from "@/hooks/use-channel-id";
import { Loader, TriangleAlert, TriangleAlertIcon } from "lucide-react";
import { Header } from "../../components/header";
import { ChatInput } from "../../components/Chat-Input";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { MessageList } from "../../components/message-list";

const ChannelIdPage = () => {
    const channelId = useChannelId();

    const {results, status, loadMore} = useGetMessages({channelId})
    const {data: channel, isLoading: channelLoading} = useGetChannel({id: channelId})

    if(channelLoading || status === "LoadingFirstPage") 
    return(
        <div className="h-full flex-1 flex items-center justify-center bg-[#fbf9f7]">
            <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                <Loader className="animate-spin size-6 text-[#ff5018]"/>
            </div>

        </div>

        ) 


        if( !channel) 
        return(
            <div className="h-full flex-1 flex flex-col gap-y-3 items-center justify-center bg-[#fbf9f7]">
                <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                    <TriangleAlert className="size-6 text-[#ff5018]"/>
                </div>
                <span className="font-semibold tracking-tight text-[#1b1017]">
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

export default ChannelIdPage;