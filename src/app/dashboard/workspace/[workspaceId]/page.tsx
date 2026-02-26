"use client"

import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [sOpen, setIsOpen] = useCreateChannelModal();
  const { data: member, isLoading: memberLoading } = useCurrentMember({ workspaceId });
  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({ id: workspaceId });
  const { data: channels, isLoading: channelsLoading } = useGetChannels({ workspaceId });
//   const channelId = useChannelId();
  const isAdmin = useMemo(() => member?.role === "admin", [member]);
  const channelId = useMemo(() => channels?.[0]?._id, [channels]);

  useEffect(() => {
    if (workspaceLoading || channelsLoading || memberLoading || !member || !workspace) return;

    if (channelId) {
      router.replace(`/dashboard/workspace/${workspaceId}/channel/${channelId}`);
    } else if (!sOpen && isAdmin) {
      setIsOpen(true);
    }
  }, [channelId, workspaceLoading, channelsLoading, workspace, open, setIsOpen, router, workspaceId, member, memberLoading, isAdmin]);

  // centralized container for all states
  const CenteredContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center h-full w-full gap-2">
      {children}
    </div>
  );

  if (workspaceLoading || channelsLoading || memberLoading) {
    return (
      <CenteredContainer>
        <Loader className="size-6 animate-spin text-[#ff5018]" />
      </CenteredContainer>
    );
  }

  if (!workspace || !member) {
    return (
      <CenteredContainer>
        <TriangleAlert className="size-6 text-[#ff5018]" />
        <span className="text-sm text-muted-foreground">Workspace Not Found</span>
      </CenteredContainer>
    );
  }

  if (!channels ) {
    return (
      <CenteredContainer>
        <TriangleAlert className="size-6 text-[#ff5018]" />
        <span className="text-sm text-muted-foreground">No channels found</span>
      </CenteredContainer>
    );
  }


  return null;
};

export default WorkspaceIdPage;