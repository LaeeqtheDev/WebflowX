import { useQueryState} from "nuqs"


export const useProfileMmberId = () => {
    return useQueryState("profileMemberId")
}