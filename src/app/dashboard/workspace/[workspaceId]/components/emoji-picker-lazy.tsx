"use client"

import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

// Kept in its own file so the emoji dataset (large) is only downloaded
// the first time someone opens the emoji popover.
const EmojiPickerLazy = ({ onEmojiSelect }: { onEmojiSelect: (emoji: { native: string }) => void }) => (
    <Picker data={data} onEmojiSelect={onEmojiSelect} />
)

export default EmojiPickerLazy
