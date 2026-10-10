/*eslint-disable @next/next/no-img-element */

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"

import { ImageIcon } from "lucide-react"
import { useState } from "react"
import { useLowData } from "@/hooks/use-low-data"


interface ThumbnailProps {
    url: string | null | undefined
}

export const Thumbnail = ({url}: ThumbnailProps) => {
    const lowData = useLowData()
    const [wanted, setWanted] = useState(false)
    if(!url) return null;

    // data saver: images wait until the person asks for them
    if(lowData && !wanted){
        return(
            <button type="button" onClick={() => setWanted(true)} className="my-2 flex cursor-pointer items-center gap-2 rounded-xl border border-plum/12 bg-ink/5 px-3 py-2 text-sm text-ink/80 hover:bg-ink/10">
                <ImageIcon className="size-4" aria-hidden /> Load image
            </button>
        )
    }

    return(
        <Dialog>
            <DialogTrigger aria-label="Open image full size">
            <div className="relative overflow-hidden max-w-90 border border-plum/12 rounded-xl my-2 cursor-zoom-in">
            <img
            src={url}
            alt="Image attached to message"
            loading="lazy"
            decoding="async"
            className="rounded-xl object-cover size-full"
            />
        </div>
            </DialogTrigger>
            <DialogContent className="max-w-200 border-none bg-transparent p-0 shadow-none">
            <DialogHeader className="sr-only">
                <DialogTitle>Image preview</DialogTitle>
            </DialogHeader>
            <img
            src={url}
            alt="Image attached to message"
            className="rounded-md object-cover size-full"
            />
            </DialogContent>
        </Dialog>
    )
}