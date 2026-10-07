"use client"
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const CreateWorkspaceModal = dynamic(
  () => import("@/features/workspaces/components/create-workspace-modal").then((m) => m.CreateWorkspaceModal),
  { ssr: false },
);
const CreateChannelModal = dynamic(
  () => import("@/features/channels/components/create-channel-modal").then((m) => m.CreateChannelModal),
  { ssr: false },
);

export const Modals = () => { 
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return null;
  return(
    <>
    <CreateChannelModal/>
    <CreateWorkspaceModal/>
    </>
  )
}
