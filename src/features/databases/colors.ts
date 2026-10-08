import type { OptionColor } from "../../../convex/dbTypes"

// Written out in full so Tailwind can see every class.
export const CHIP: Record<OptionColor, string> = {
  gray: "bg-neutral-200/70 text-neutral-800",
  brown: "bg-amber-900/15 text-amber-950",
  orange: "bg-orange-200/80 text-orange-950",
  yellow: "bg-yellow-200/80 text-yellow-950",
  green: "bg-green-200/80 text-green-950",
  blue: "bg-sky-200/80 text-sky-950",
  purple: "bg-purple-200/80 text-purple-950",
  pink: "bg-pink-200/80 text-pink-950",
  red: "bg-red-200/80 text-red-950",
}
export const DOT: Record<OptionColor, string> = {
  gray: "bg-neutral-400", brown: "bg-amber-800", orange: "bg-orange-500", yellow: "bg-yellow-400",
  green: "bg-green-500", blue: "bg-sky-500", purple: "bg-purple-500", pink: "bg-pink-500", red: "bg-red-500",
}
