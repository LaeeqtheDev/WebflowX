"use client";
import { usePermissions } from "@/hooks/use-permissions"

import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { GetStartedCard, useGetStarted } from "./components/first-run";
import { cleanChannelName } from "./components/channel-icon";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { forgetLocation } from "@/lib/last-location";
import { Button } from "@/components/ui/button";

// centralized container for all states
const CenteredContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center h-full w-full gap-3 bg-cream-soft">
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
  const perms = usePermissions();
  const isAdmin = perms.can("createChannels");
  const started = useGetStarted();
  const channelId = useMemo(() => channels?.[0]?._id, [channels]);

  useEffect(() => {
    if (workspaceLoading || channelsLoading || memberLoading || !member || !workspace || !started.ready) return;
    // Admins who haven't finished (or dismissed) the checklist land on the home view instead
    if (started.show) return;

    if (channelId) {
      router.replace(`/dashboard/workspace/${workspaceId}/channel/${channelId}`);
    } else if (!IsOpen && isAdmin) {
      setIsOpen(true);
    }
  }, [channelId, workspaceLoading, channelsLoading, workspace, setIsOpen, router, workspaceId, member, memberLoading, isAdmin, IsOpen, started.ready, started.show]);

  // Someone who still has to enter their two-step code gets empty answers from the server: not the same as "gone".
  const tf = useQuery(api.twoFactor.status);
  const verified = tf !== undefined && (!tf?.enabled || tf.verified);
  const gone = verified && !workspaceLoading && !memberLoading && (!workspace || !member);
  useEffect(() => {
    // A remembered link to a workspace this person can no longer open: forget it and start from their list.
    if (gone) { forgetLocation(); router.replace("/dashboard?fresh=1"); }
  }, [gone, router]);

  if (workspaceLoading || channelsLoading || memberLoading || !started.ready) {
    return (
      <CenteredContainer>
        <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
          <Loader className="size-6 animate-spin text-brand" />
        </div>
      </CenteredContainer>
    );
  }

  if (!workspace || !member) {
    return (
      <CenteredContainer>
        <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
          <TriangleAlert className="size-6 text-brand" />
        </div>
        <span className="font-semibold tracking-tight text-ink">Workspace Not Found</span>
      </CenteredContainer>
    );
  }

  if (started.show) {
    const first = channels?.[0];
    return (
      <div className="h-full overflow-y-auto bg-cream-soft px-4 py-8 md:py-14">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome to {workspace.name}</h1>
            <p className="mt-1 text-sm text-ink/65">Three quick steps to get your workspace humming.</p>
          </div>
          <GetStartedCard />
          {first && (
            <Button
              variant="outline"
              className="h-11 self-start rounded-xl border-plum/15 md:h-10"
              onClick={() => router.push(`/dashboard/workspace/${workspaceId}/channel/${first._id}`)}
            >
              Open #{cleanChannelName(first.name)}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (channelId) {
    // redirecting to the first channel
    return (
      <CenteredContainer>
        <div className="size-14 rounded-2xl bg-brand/10 text-orange-ink flex items-center justify-center">
          <Loader className="size-6 animate-spin" />
        </div>
      </CenteredContainer>
    );
  }

  if (!channels ) {
    return (
      <CenteredContainer>
        <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
          <TriangleAlert className="size-6 text-brand" />
        </div>
        <span className="font-semibold tracking-tight text-ink">No channels found</span>
      </CenteredContainer>
    );
  }

  // No channels yet. Admins get the "create channel" modal; everyone else sees guidance.
  return (
    <CenteredContainer>
      <div className="size-14 rounded-2xl bg-brand/10 text-orange-ink flex items-center justify-center">
        <TriangleAlert className="size-6" />
      </div>
      <span className="font-semibold tracking-tight text-ink">No channels yet</span>
      <p className="max-w-xs text-center text-sm text-ink/65">
        {isAdmin
          ? "Create your first channel to start the conversation."
          : "Ask a workspace admin to create a channel, or start a direct message."}
      </p>
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-1 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Create a channel
        </button>
      ) : (
        <Link href="/dashboard" className="mt-1 text-sm font-semibold text-orange-ink hover:underline">
          Back to dashboard
        </Link>
      )}
    </CenteredContainer>
  );
};

export default WorkspaceIdPage;
