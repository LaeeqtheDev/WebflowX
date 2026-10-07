"use client"

import { useCreateOrGetConversation } from "@/features/conversations/api/use-create-or-get-conversation";
import { useMemberId } from "@/hooks/use-member-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Conversation } from "./conversation";
import { NotFoundState } from "@/components/states/not-found-state";

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
         <div className="h-full flex items-center justify-center bg-[#fbf9f7]">
                <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#c2370d] flex items-center justify-center">
                  <Loader className="size-6 animate-spin"/>
                </div>
            </div>
      )
    }

    if(!conversationId){
      return(
         <NotFoundState
            title="Conversation not found"
            description="We couldn't open this conversation. It may not exist, or you may not have access to it."
            href={`/dashboard/workspace/${workspaceId}`}
            linkLabel="Back to workspace"
         />
      )
    }


   return <Conversation id={conversationId}/>
}

export default MemberIdPage;