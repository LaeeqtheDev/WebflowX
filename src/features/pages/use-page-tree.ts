"use client"
import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

export type PageNode = {
  _id: Id<"docs">
  title: string
  icon: string | null
  type: "document" | "spreadsheet" | "database"
  parentId: Id<"docs"> | null
  position: number
  updatedAt: number
  children: PageNode[]
}

// The workspace's pages as a tree (plus a flat lookup and the pages you starred).
export const usePageTree = (workspaceId: Id<"workspaces">) => {
  const flat = useQuery(api.docs.tree, { workspaceId })
  const favoriteIds = useQuery(api.docs.favoriteIds, { workspaceId })

  return useMemo(() => {
    const byId = new Map<string, PageNode>()
    for (const d of flat ?? []) byId.set(d._id, { ...d, children: [] })
    const roots: PageNode[] = []
    for (const n of byId.values()) {
      const parent = n.parentId ? byId.get(n.parentId) : undefined
      if (parent) parent.children.push(n)
      else roots.push(n)
    }
    const sort = (list: PageNode[]) => { list.sort((a, b) => a.position - b.position); list.forEach((n) => sort(n.children)) }
    sort(roots)
    const favorites = (favoriteIds ?? []).map((id) => byId.get(id)).filter((n): n is PageNode => !!n)
    return { isLoading: flat === undefined, roots, byId, favorites, favoriteSet: new Set<string>(favoriteIds ?? []) }
  }, [flat, favoriteIds])
}

export const ancestorsOf = (byId: Map<string, PageNode>, id: string | undefined): PageNode[] => {
  const out: PageNode[] = []
  let cur = id ? byId.get(id) : undefined
  for (let i = 0; cur && i < 12; i++) {
    out.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return out
}

export const descendantIds = (node: PageNode): string[] => node.children.flatMap((c) => [c._id as string, ...descendantIds(c)])
