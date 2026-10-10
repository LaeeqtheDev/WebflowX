import { Id } from "../../convex/_generated/dataModel";
import { useRouteId } from "./use-route-id";

export const useWorkspaceId = () => useRouteId("workspace", "workspaceId") as Id<"workspaces">;
