"use client"
import { usePermissions } from "@/hooks/use-permissions"

import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

// centralized container for all states
const CenteredContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center h-full w-full gap-3 bg-[#fbf9f7]">
    {children}
  </div>
);

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [IsOpen, setIsOpen] = useCreateChannelModal();
  const { data: member, isLoading: memberLoading } = useCurrentMember({ workspaceId });
  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({ id: workspaceId });
  const { data: channels, isLoading: channelsLoading } = useGetChannels({ workspaceId });
//   const channelId = useChannelId();
  const perms = usePermissions();
  const isAdmin = perms.can("createChannels");
  const channelId = useMemo(() => channels?.[0]?._id, [channels]);

  useEffect(() => {
    if (workspaceLoading || channelsLoading || memberLoading || !member || !workspace) return;

    if (channelId) {
      router.replace(`/dashboard/workspace/${workspaceId}/channel/${channelId}`);
    } else if (!IsOpen && isAdmin) {
      setIsOpen(true);
    }
  }, [channelId, workspaceLoading, channelsLoading, workspace, open, setIsOpen, router, workspaceId, member, memberLoading, isAdmin]);

  if (workspaceLoading || channelsLoading || memberLoading) {
    return (
      <CenteredContainer>
        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
          <Loader className="size-6 animate-spin text-[#ff5018]" />
        </div>
      </CenteredContainer>
    );
  }

  if (!workspace || !member) {
    return (
      <CenteredContainer>
        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
          <TriangleAlert className="size-6 text-[#ff5018]" />
        </div>
        <span className="font-semibold tracking-tight text-[#1b1017]">Workspace Not Found</span>
      </CenteredContainer>
    );
  }

  if (!channels ) {
    return (
      <CenteredContainer>
        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
          <TriangleAlert className="size-6 text-[#ff5018]" />
        </div>
        <span className="font-semibold tracking-tight text-[#1b1017]">No channels found</span>
      </CenteredContainer>
    );
  }


  return null;
};

export default WorkspaceIdPage;