import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Info, Search } from "lucide-react"

export const Toolbar = () => {
  const workspaceId = useWorkspaceId()
  const { data } = useGetWorkspace({ id: workspaceId })

  return (
    <nav className="bg-[#381d2a] flex items-center h-10 px-2">
      {/* LEFT: Logo */}
      <div className="flex-1 flex items-center">
        <Image
          src="/logo.png"
          alt="Logo"
          width={60}
          height={60}
          className="-ml-1 mt-2"
        />
      </div>

      {/* CENTER: Search */}
      <div className="min-w-70 max-w-160.5 grow-2 shrink">
        <Button
          className="bg-accent/25 hover:bg-accent/25 w-full justify-start h-7 px-2"
          size="sm"
        >
          <Search className="mr-2 size-4 text-white" />
          <span className="text-white text-xs">
            Search {data?.name}
          </span>
        </Button>
      </div>

      {/* RIGHT: Info */}
      <div className="flex-1 flex items-center justify-end">
        <Button variant="trasnparent">
          <Info className="size-5 text-white" />
        </Button>
      </div>
    </nav>
  )
}
