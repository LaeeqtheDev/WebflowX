"use client"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

const EMOJIS = [
  "📄", "📝", "📋", "📌", "📎", "📚", "📖", "📓", "🗂️", "🗒️", "📅", "📆", "🗓️", "📊", "📈", "📉",
  "🎯", "🚀", "💡", "🔥", "⭐", "✨", "🏆", "🎉", "🧠", "💬", "📣", "📢", "🔔", "🔒", "🔑", "🛠️",
  "⚙️", "🧪", "🐛", "🧩", "🧭", "🗺️", "🏗️", "🏠", "🏢", "🌍", "🌱", "🌟", "🍀", "☕", "🍕", "🎨",
  "🎬", "🎵", "📷", "💻", "📱", "🖥️", "🖋️", "✅", "☑️", "❓", "❗", "💰", "🧾", "🤝", "👥", "🙌",
  "🔍", "🔗", "📦", "🚚", "✈️", "🧳", "🎓", "🩺", "⚡", "🌈", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣",
]

export const EmojiPicker = ({
  value, onChange, children, allowClear = true,
}: {
  value?: string | null
  onChange: (emoji: string | null) => void
  children: React.ReactNode
  allowClear?: boolean
}) => {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`Use ${e}`}
              onClick={() => { onChange(e); setOpen(false) }}
              className={`flex size-8 items-center justify-center rounded-md text-lg hover:bg-cream-deep ${value === e ? "bg-[#ff5018]/15" : ""}`}
            >
              {e}
            </button>
          ))}
        </div>
        {allowClear && value && (
          <Button type="button" variant="ghost" size="sm" className="mt-2 h-8 w-full text-xs" onClick={() => { onChange(null); setOpen(false) }}>
            Remove icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
