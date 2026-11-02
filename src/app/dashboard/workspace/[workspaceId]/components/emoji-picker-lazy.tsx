"use client"

import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { useIsDark } from "@/hooks/use-theme-pref"

// Kept in its own file so the emoji dataset (large) is only downloaded
// the first time someone opens the emoji popover.
const EmojiPickerLazy = ({ onEmojiSelect }: { onEmojiSelect: (emoji: { native: string }) => void }) => {
    const isDark = useIsDark()
    // one column narrower on small phones so the picker never runs off the screen
    const narrow = typeof window !== "undefined" && window.innerWidth < 400
    return <Picker data={data} theme={isDark ? "dark" : "light"} onEmojiSelect={onEmojiSelect} perLine={narrow ? 8 : 9} />
}

export default EmojiPickerLazy
