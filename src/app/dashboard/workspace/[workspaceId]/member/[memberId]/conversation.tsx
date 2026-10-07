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

interface ConversationProps {
    id: Id<"conversations">
}

export const Conversation = ({id}: ConversationProps) => {
    const memberId = useMemberId()
    const workspaceId = useWorkspaceId()

    const {onOpenProfile} = usePanel()

    const {data: member, isLoading: memberLoading} = useGetMember({id: memberId})
    const {results, status, loadMore} = useGetMessages({
        conversationId: id,
    });

    if(memberLoading || status === "LoadingFirstPage"){
        return(
           <div className="h-full flex items-center justify-center">
                  <Loader className="size-6 animate-spin  text-[#ff5018] "/>
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
  
 
    return(
        <div className="flex flex-col h-full min-h-0">
            <Header
            memberName={member?.user.name}
            memberImage={member?.user.image}
            onClick={() => onOpenProfile(memberId)}
            conversationId={id}
            otherMemberId={memberId}
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