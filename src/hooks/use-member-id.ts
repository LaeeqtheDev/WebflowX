import { Id } from "../../convex/_generated/dataModel";
import { useRouteId } from "./use-route-id";

export const useMemberId = () => useRouteId("member", "memberId") as Id<"members">;
