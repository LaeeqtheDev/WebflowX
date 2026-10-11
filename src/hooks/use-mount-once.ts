import { useState } from "react"

/**
 * True from the first time `open` becomes true, and stays true afterwards. Lets a modal be code-split and only
 * fetched and mounted once the person first asks for it, while still playing its close animation afterwards.
 */
export function useMountOnce(open: boolean) {
  const [seen, setSeen] = useState(open)
  if (open && !seen) setSeen(true)
  return seen
}
