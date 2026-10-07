"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCreateWorkspaceModal } from "../store/use-create-workspace-modal"
import { useCreateWorkspace } from "../api/use-create-workspace"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { errorMessage } from "@/lib/error-message"

export const CreateWorkspaceModal = () => {
  const [open, setOpen] = useCreateWorkspaceModal()
  const [name, setName] = useState("");
  const {mutate, isPending} = useCreateWorkspace()
  const router =  useRouter()


  const handleClose = () => {
    setOpen(false)
    setName("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  mutate({name},{
    onSuccess(id){
      toast.success("Workspace created successfully")
      router.push(`/dashboard/workspace/${id}`)
      handleClose()
    },
    onError(error){
      const message = errorMessage(error)
      if (message.startsWith("LIMIT_REACHED:workspaces")) {
        const limit = message.split(":")[2]
        toast.error(`Your plan allows ${limit} workspace${limit === "1" ? "" : "s"}. Upgrade one of your workspaces to create more.`)
      } else {
        toast.error("Failed to create workspace")
      }
    }
  })

  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">Create your workspace</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}
          className="space-y-5"
  
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            autoFocus
            minLength={3}
            placeholder="Workspace Name e.g. 'Work', 'Personal', 'Home'"
          />

          <div className="flex justify-end">
            <Button disabled={isPending}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
