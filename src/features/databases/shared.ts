import type { Prop, View } from "../../../convex/dbTypes"
import type { DbCtx } from "./ctx"
import type { Row } from "./engine"

export type ViewProps = {
  view: View
  rows: Row[]
  ctx: DbCtx
  onView: (v: View) => void
  onAdd: (values?: Record<string, unknown>, afterPosition?: number) => void
  onMove: (rowId: string, position: number, values?: Record<string, unknown>) => void
}

// Properties in the order this view wants, minus the ones it hides.
export const visibleProps = (view: View, ctx: DbCtx): Prop[] => {
  const hidden = new Set(view.hidden)
  const rank = new Map(view.order.map((id, i) => [id, i]))
  return ctx.props
    .filter((p) => !hidden.has(p.id))
    .map((p, i) => ({ p, k: rank.has(p.id) ? (rank.get(p.id) as number) : 1000 + i }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.p)
}

// A position between two neighbours; either side may be missing.
export const positionBetween = (before?: number, after?: number): number => {
  if (before !== undefined && after !== undefined) return before === after ? before + 0.0001 : (before + after) / 2
  if (before !== undefined) return before + 1
  if (after !== undefined) return after - 1
  return Date.now()
}
