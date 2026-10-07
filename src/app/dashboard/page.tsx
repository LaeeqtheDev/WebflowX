"use client"
import {UserButton} from '@/features/auth/components/user-button'
import { useCreateWorkspaceModal } from '@/features/workspaces/store/use-create-workspace-modal';
import { useGetWorkspaces } from '@/features/workspaces/api/use-get-workspaces'
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

export default function Home(){
  const {data, isLoading} = useGetWorkspaces();
  const [open, setOpen]= useCreateWorkspaceModal()

  const workSpaceId = useMemo(() => data?.[0]?._id, [data]);

  const router = useRouter()

  useEffect(() => {

    if(isLoading) return;

    if(workSpaceId){
      router.replace(`/dashboard/workspace/${workSpaceId}`)
    } else if(!open) {
      setOpen(true)
    }
  }, [workSpaceId, isLoading, open, setOpen, router]);




  return(
    <div className="min-h-screen bg-cream-soft flex flex-col items-center justify-center gap-4">
      <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
        <Loader className="size-6 animate-spin text-[#ff5018]" />
      </div>
      <UserButton />
    </div>
  )
}