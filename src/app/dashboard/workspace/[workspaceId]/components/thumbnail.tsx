/*eslint-disable @next/next/no-img-element */

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"

import { XIcon } from "lucide-react"


interface ThumbnailProps {
    url: string | null | undefined
}

export const Thumbnail = ({url}: ThumbnailProps) => {
    if(!url) return null;

    return(
        <Dialog>
            <DialogTrigger aria-label="Open image full size">
            <div className="relative overflow-hidden max-w-90 border border-[#381d2a]/12 rounded-xl my-2 cursor-zoom-in">
            <img
            src={url}
            alt="Image attached to message"
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