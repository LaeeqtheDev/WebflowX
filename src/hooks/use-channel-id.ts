import { Id } from "../../convex/_generated/dataModel";
import { useRouteId } from "./use-route-id";

export const useChannelId = () => useRouteId("channel", "channelId") as Id<"channels">;
