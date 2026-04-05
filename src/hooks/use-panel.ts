import { useParentMessageId } from "@/features/messages/store/use-parent-message-id";
import { useProfileMmberId } from "@/features/members/store/use-profile-member-id";



export const usePanel = () => {
    const [parentMessageId, setParentMessageId] = useParentMessageId()
    const [profileMemberId, setProfileMemberId] = useProfileMmberId()

    const onOpenProfile = (memberId: string) => {
        setProfileMemberId(memberId)
        setParentMessageId(null)
    }

    const onOpenMessage = (messageId: string) => {
        setParentMessageId(messageId)
        setProfileMemberId(null)
    }

    const onClose =()=>{
        setParentMessageId(null)
        setProfileMemberId(null)
    }

    return{ parentMessageId, onClose, onOpenMessage, onOpenProfile, profileMemberId}
}
