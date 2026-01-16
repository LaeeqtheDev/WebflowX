"use client"
import {UserButton} from '@/features/auth/components/user-button'
import { useCreateWorkspaceModal } from '@/features/workspaces/store/use-create-workspace-modal';
import { useGetWorkspaces } from '@/features/workspaces/api/use-get-workspaces'
import { useEffect, useMemo } from 'react';

export default function Home(){
  const {data, isLoading} = useGetWorkspaces();
  const [open, setOpen]= useCreateWorkspaceModal()

  const workSpaceId = useMemo(() => data?.[0]?._id, [data]);

  useEffect(() => {

    if(isLoading) return;

    if(workSpaceId){
      console.log("Redirect to workspace:");
    } else if(!open) {
      setOpen(true)
    }
  }, [workSpaceId, isLoading, open, setOpen]);




  return(
    <div className="">
      <UserButton />
    </div>
  )
}