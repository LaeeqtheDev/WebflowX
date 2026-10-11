import Image from "next/image"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Info, Menu, Search } from "lucide-react"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useMountOnce } from "@/hooks/use-mount-once"

const ToolbarSearch = dynamic(() => import("./toolbar-search").then((m) => m.ToolbarSearch), { ssr: false })

export const Toolbar = ({ onOpenMenu }: { onOpenMenu?: () => void }) => {
  const workspaceId = useWorkspaceId()
  const { data } = useGetWorkspace({ id: workspaceId })
  const [open, setOpen] = useState(false)
  const searchMounted = useMountOnce(open)

  return (
    <nav className="relative z-10 flex h-14 shrink-0 items-center gap-1 border-b border-white/[0.07] bg-chrome px-2 md:gap-0 md:px-4">
      {/* LEFT: Menu (phones) + Logo */}
      <div className="flex items-center gap-1 max-md:shrink-0 md:flex-1">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="flex size-10 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 active:scale-95 md:hidden"
          >
            <Menu className="size-5" />
          </button>
        )}
        <Image
          src="/logo.png"
          alt="WebflowX"
          width={34}
          height={34}
          priority
          className="h-[34px] w-[34px] object-contain"
        />
      </div>

      {/* CENTER: Search */}
      <div className="min-w-70 max-w-160.5 grow-2 shrink max-md:min-w-0 max-md:flex-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search workspace"
          className="group flex h-10 md:h-9 w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 text-left transition-all hover:border-white/20 hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
        >
          <Search className="size-4 shrink-0 text-white/60 transition-colors group-hover:text-white" />
          <span className="truncate text-[13px] font-medium tracking-tight text-white/60 group-hover:text-white/80">
            Search {data?.name}
          </span>
        </button>

        {searchMounted && <ToolbarSearch open={open} setOpen={setOpen} />}
      </div>

      {/* RIGHT: Help */}
      <div className="flex items-center justify-end max-md:shrink-0 md:flex-1">
        <a
          href="mailto:support@northfoundry.co"
          aria-label="Help and support: support@northfoundry.co"
          title="Help & support · support@northfoundry.co"
          className="flex size-10 md:size-9 items-center justify-center rounded-xl text-white/70 transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 active:scale-95"
        >
          <Info className="size-5" />
        </a>
      </div>
    </nav>
  )
}