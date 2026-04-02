"use client"

import { useCreateOrGetConversation } from "@/features/conversations/api/use-create-or-get-conversation";
import { useMemberId } from "@/hooks/use-member-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { AlertTriangle, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Conversation } from "./conversation";

const MemberIdPage = () => {
    const workspaceId = useWorkspaceId()
    const memberId = useMemberId()
    const { mutate, isPending}= useCreateOrGetConversation()

    const [conversationId, setConversationId] = useState<Id<"conversations">| null>(null)


    useEffect(() => {
      mutate({
         workspaceId,
         memberId
      },{
         onSuccess(data){
           setConversationId(data)
         },
         onError(){
           toast.error("Failed to create or get conversation")
         }
      })
    }, [memberId, workspaceId, mutate])

    if(isPending){
      return(
         <div className="h-full flex items-center justify-center">
                <Loader className="size-6 animate-spin  text-[#ff5018] "/>
            </div>
      )
    }

    if(!conversationId){
      return(
         <div className="h-full flex items-center justify-center">
                <AlertTriangle className="size-6  text-[#ff5018]"/>
                <span className="text-sm text-muted-foreground">
                  Conversation not found
                </span>
            </div>
      )
    }


   return <Conversation id={conversationId}/>
}

export default MemberIdPage;