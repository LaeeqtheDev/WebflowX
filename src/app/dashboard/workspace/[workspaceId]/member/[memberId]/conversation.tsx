import { useMemberId } from "@/hooks/use-member-id";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useGetMember } from "@/features/members/api/use-get-member";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { Loader } from "lucide-react";
import { Header } from "./header";
import { ChatInput } from "./Chat-Input";
import { MessageList } from "../../components/message-list";
import { usePanel } from "@/hooks/use-panel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { NotFoundState } from "@/components/states/not-found-state";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../../../../convex/_generated/api";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { errorMessage } from "@/lib/error-message";

interface ConversationProps {
    id: Id<"conversations">
}

export const Conversation = ({id}: ConversationProps) => {
    const memberId = useMemberId()
    const workspaceId = useWorkspaceId()

    const {onOpenProfile} = usePanel()
    const router = useRouter()
    const {data: me} = useCurrentMember({workspaceId})
    const createMeeting = useMutation(api.meetings.create)
    const [calling, setCalling] = useState(false)

    const {data: member, isLoading: memberLoading} = useGetMember({id: memberId})
    const {results, status, loadMore} = useGetMessages({
        conversationId: id,
    });

    if(memberLoading || status === "LoadingFirstPage"){
        return(
           <div className="h-full flex items-center justify-center">
                  <Loader className="size-6 animate-spin  text-brand "/>
              </div>
        )
      }

    if(!member){
        return(
            <NotFoundState
                title="Member not found"
                description="This person may have left the workspace, or you may not have access to this conversation."
                href={`/dashboard/workspace/${workspaceId}`}
                linkLabel="Back to workspace"
            />
        )
    }
  
 
    // Private call of up to 15 minutes: create it, notify them, and join right away from the Meetings page.
    const canCall = !!me && me.role !== "guest" && member.role !== "guest" && me._id !== memberId
    const startCall = async () => {
        if (calling) return
        setCalling(true)
        try {
            const meetingId = await createMeeting({
                workspaceId,
                title: "Call",
                roomName: `${workspaceId}-${Date.now()}`,
                kind: "oneToOne",
                inviteeId: memberId,
            })
            router.push(`/dashboard/workspace/${workspaceId}/meeting?join=${meetingId}`)
        } catch (e) {
            toast.error(errorMessage(e) || "Couldn't start the call")
            setCalling(false)
        }
    }

    return(
        <div className="flex flex-col h-full min-h-0">
            <Header
            memberName={member?.user.name}
            memberImage={member?.user.image}
            onClick={() => onOpenProfile(memberId)}
            conversationId={id}
            otherMemberId={memberId}
            onCall={canCall ? startCall : undefined}
            calling={calling}
            />
            <MessageList
            data={results}
            variant="conversation"
            memberImage={member?.user.image}
            memberName={member?.user.name}
            loadMore={loadMore}
            isLoadingMore={status === "LoadingMore"}
            canLoadMore={status === "CanLoadMore"}
            />


            <ChatInput
            placeholder={`Message ${member?.user.name}`}
            conversationId={id}
            />
        </div>
    )
}