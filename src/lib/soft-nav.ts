// Switching between two channels (or two direct messages) needs no new page from the server: it is the same screen showing
// different data. Going through the router asked the server for a page on every click and showed a loading placeholder
// while it answered. Here the address is updated in the browser and the screen reads the new id from it.
import type { MouseEvent } from "react"

const CHANNEL = /^\/dashboard\/workspace\/[A-Za-z0-9]+\/channel\/[A-Za-z0-9]+$/
const MEMBER = /^\/dashboard\/workspace\/[A-Za-z0-9]+\/member\/[A-Za-z0-9]+$/

const workspaceOf = (path: string) => path.split("/")[3]

// same kind of screen in the same workspace
export const sameKind = (current: string, target: string) =>
  workspaceOf(current) === workspaceOf(target) &&
  ((CHANNEL.test(current) && CHANNEL.test(target)) || (MEMBER.test(current) && MEMBER.test(target)))

/** onClick for a sidebar link: switches in place when it can, otherwise leaves the normal navigation alone. */
export const softNav = (e: MouseEvent<HTMLElement>, href: string) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const current = window.location.pathname
  if (!sameKind(current, href)) return
  e.preventDefault()
  window.history.pushState(null, "", href)
}
