"use client"
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";
import { CreateChannelModal } from "@/features/channels/components/create-channel-modal";
import { useSyncExternalStore } from "react";

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