import type { Prop, View, Option } from "../../../convex/dbTypes"
import type { Env, MemberLite, Row, Related } from "./engine"
import type { makeComputer } from "./engine"

export type Me = { id: string; name: string; image?: string; color: string }

// Everything a cell or a view needs, handed down once instead of through twenty props.
export type DbCtx = {
  docId: string
  workspaceId: string
  props: Prop[]
  env: Env
  comp: ReturnType<typeof makeComputer>
  members: MemberLite[]
  related: Map<string, Related>
  databases: { _id: string; title: string; icon: string | null }[]
  canEditSchema: boolean
  me: Me
  setCell: (rowId: string, propId: string, value: unknown) => Promise<void>
  setTitle: (rowId: string, title: string) => Promise<void>
  addOption: (prop: Prop, name: string) => Promise<Option | null>
  openRow: (rowId: string) => void
  editProp: (propId: string) => void
}

export type { Row, View }
