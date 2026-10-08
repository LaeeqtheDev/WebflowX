"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="sheet-title" className={cn("text-base font-semibold", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

// A slide-over panel built on the Radix dialog (focus trap, Esc to close, scroll lock, aria-modal).
function SheetContent({
  className,
  children,
  side = "left",
  closeLabel = "Close menu",
  closeClassName,
  closeIcon,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "left" | "right" | "bottom"
  closeLabel?: string
  closeClassName?: string
  closeIcon?: React.ReactNode
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="sheet-overlay"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 dark:bg-black/70"
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col bg-background shadow-xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          side === "left" && "inset-y-0 left-0 h-dvh w-[min(88vw,22rem)] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          side === "right" && "inset-y-0 right-0 h-dvh w-[min(88vw,22rem)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className={cn("absolute right-2 top-2 z-10 flex size-10 items-center justify-center rounded-lg text-current opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]/70", closeClassName)}
        >
          {closeIcon ?? <XIcon className="size-5" />}
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle }
