// Shared by the Convex functions and the app (a plain module: no database access in here).
// Describes what a database is made of and cleans anything that arrives from a browser.

export const PROP_TYPES = [
    "text", "number", "select", "multiSelect", "status", "date", "person", "checkbox",
    "url", "email", "phone", "relation", "rollup", "formula", "createdTime", "lastEdited", "createdBy",
] as const
export type PropType = (typeof PROP_TYPES)[number]

// properties whose value is worked out, never typed in
export const COMPUTED_TYPES: PropType[] = ["rollup", "formula", "createdTime", "lastEdited", "createdBy"]

export const COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const
export type OptionColor = (typeof COLORS)[number]

export type StatusGroup = "todo" | "progress" | "done"
export type Option = { id: string; name: string; color: OptionColor; group?: StatusGroup }

export const ROLLUP_FNS = [
    "count", "countValues", "countUnique", "countEmpty", "percentEmpty", "percentNotEmpty",
    "sum", "average", "median", "min", "max", "range", "earliest", "latest",
    "checked", "unchecked", "percentChecked", "showOriginal",
] as const
export type RollupFn = (typeof ROLLUP_FNS)[number]

export type NumberFormat = "number" | "percent" | "usd" | "eur" | "gbp"

export type Prop = {
    id: string
    name: string
    type: PropType
    options?: Option[]
    numberFormat?: NumberFormat
    relation?: { databaseId: string; many: boolean }
    rollup?: { relationId: string; targetId: string; fn: RollupFn }
    formula?: string
}

export const VIEW_TYPES = ["table", "board", "list", "gallery", "calendar"] as const
export type ViewType = (typeof VIEW_TYPES)[number]

export type Condition = { id: string; propId: string; op: string; value?: unknown }
export type Filter = { match: "and" | "or"; conditions: Condition[] }
export type Sort = { propId: string; dir: "asc" | "desc" }

export type View = {
    id: string
    name: string
    type: ViewType
    filter: Filter
    sorts: Sort[]
    groupBy?: string
    hidden: string[]
    order: string[]
    widths: Record<string, number>
    dateProp?: string
    cardSize?: "sm" | "md" | "lg"
    wrap?: boolean
  // footer calculation per column in a table (property id -> calculation)
  calcs?: Record<string, RollupFn>
}

export type DateValue = { start: string; end?: string }

export const MAX_PROPS = 40
export const MAX_VIEWS = 20
export const MAX_OPTIONS = 60
export const MAX_ROWS_PER_DB = 2000
export const MAX_CONDITIONS = 20

const ID_RE = /^[A-Za-z0-9_-]{1,24}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/

const str = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max) : "")
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)

export const newId = (len = 8) => {
    const a = "abcdefghijklmnopqrstuvwxyz0123456789"
    let s = ""
    for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)]
    return s
}

export class DbError extends Error {}

const cleanOption = (raw: unknown): Option => {
    if (!isObj(raw)) throw new DbError("Invalid option")
    const id = typeof raw.id === "string" && ID_RE.test(raw.id) ? raw.id : newId()
    const name = str(raw.name, 40).trim()
    if (!name) throw new DbError("Options need a name")
    const color = (COLORS as readonly string[]).includes(raw.color as string) ? (raw.color as OptionColor) : "gray"
    const group = raw.group === "todo" || raw.group === "progress" || raw.group === "done" ? raw.group : undefined
    return group ? { id, name, color, group } : { id, name, color }
}

export const cleanProp = (raw: unknown): Prop => {
    if (!isObj(raw)) throw new DbError("Invalid property")
    const type = raw.type as PropType
    if (!(PROP_TYPES as readonly string[]).includes(type)) throw new DbError("Unknown property type")
    const id = typeof raw.id === "string" && ID_RE.test(raw.id) ? raw.id : newId()
    const name = str(raw.name, 60).replace(/\s+/g, " ").trim()
    if (!name) throw new DbError("Properties need a name")
    const out: Prop = { id, name, type }
    if (type === "select" || type === "multiSelect" || type === "status") {
        const opts = Array.isArray(raw.options) ? raw.options.slice(0, MAX_OPTIONS).map(cleanOption) : []
        const seen = new Set<string>()
        out.options = opts.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
    }
    if (type === "number") {
        out.numberFormat = ["number", "percent", "usd", "eur", "gbp"].includes(raw.numberFormat as string) ? (raw.numberFormat as NumberFormat) : "number"
    }
    if (type === "relation") {
        const r = raw.relation
        if (!isObj(r) || typeof r.databaseId !== "string" || !r.databaseId) throw new DbError("Choose a database to relate to")
        out.relation = { databaseId: r.databaseId, many: r.many !== false }
    }
    if (type === "rollup") {
        const r = raw.rollup
        if (!isObj(r) || typeof r.relationId !== "string" || typeof r.targetId !== "string") throw new DbError("Choose a relation and a property to roll up")
        const fn = (ROLLUP_FNS as readonly string[]).includes(r.fn as string) ? (r.fn as RollupFn) : "count"
        out.rollup = { relationId: r.relationId, targetId: r.targetId, fn }
    }
    if (type === "formula") {
        out.formula = str(raw.formula, 2000)
    }
    return out
}

export const cleanFilter = (raw: unknown): Filter => {
    const f = isObj(raw) ? raw : {}
    const conditions = (Array.isArray(f.conditions) ? f.conditions : []).slice(0, MAX_CONDITIONS).flatMap((c): Condition[] => {
        if (!isObj(c) || typeof c.propId !== "string" || typeof c.op !== "string") return []
        const value = typeof c.value === "string" ? c.value.slice(0, 500) : typeof c.value === "number" || typeof c.value === "boolean" ? c.value : undefined
        return [{ id: typeof c.id === "string" && ID_RE.test(c.id) ? c.id : newId(), propId: c.propId.slice(0, 24), op: c.op.slice(0, 24), value }]
    })
    return { match: f.match === "or" ? "or" : "and", conditions }
}

export const cleanView = (raw: unknown): View => {
    if (!isObj(raw)) throw new DbError("Invalid view")
    const type = raw.type as ViewType
    if (!(VIEW_TYPES as readonly string[]).includes(type)) throw new DbError("Unknown view type")
    const id = typeof raw.id === "string" && ID_RE.test(raw.id) ? raw.id : newId()
    const name = str(raw.name, 40).replace(/\s+/g, " ").trim() || "View"
    const sorts = (Array.isArray(raw.sorts) ? raw.sorts : []).slice(0, 5).flatMap((s): Sort[] =>
        isObj(s) && typeof s.propId === "string" ? [{ propId: s.propId.slice(0, 24), dir: s.dir === "desc" ? "desc" : "asc" }] : [])
    const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string").map((i) => i.slice(0, 24)).slice(0, MAX_PROPS + 2) : [])
    const widths: Record<string, number> = {}
    if (isObj(raw.widths)) {
        for (const [k, w] of Object.entries(raw.widths).slice(0, MAX_PROPS + 2)) {
            if (ID_RE.test(k) && typeof w === "number" && Number.isFinite(w)) widths[k] = Math.min(800, Math.max(60, Math.round(w)))
        }
    }
    const view: View = {
        id, name, type,
        filter: cleanFilter(raw.filter),
        sorts,
        hidden: ids(raw.hidden),
        order: ids(raw.order),
        widths,
    }
    if (typeof raw.groupBy === "string" && raw.groupBy) view.groupBy = raw.groupBy.slice(0, 24)
    if (typeof raw.dateProp === "string" && raw.dateProp) view.dateProp = raw.dateProp.slice(0, 24)
    if (raw.cardSize === "sm" || raw.cardSize === "md" || raw.cardSize === "lg") view.cardSize = raw.cardSize
    if (typeof raw.wrap === "boolean") view.wrap = raw.wrap
    if (isObj(raw.calcs)) {
        const calcs: Record<string, RollupFn> = {}
        for (const [k, f] of Object.entries(raw.calcs).slice(0, MAX_PROPS + 2)) {
            if (ID_RE.test(k) && (ROLLUP_FNS as readonly string[]).includes(f as string) && f !== "showOriginal") calcs[k] = f as RollupFn
        }
        if (Object.keys(calcs).length) view.calcs = calcs
    }
    return view
}

export const isoOk = (s: unknown): s is string => typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(s))

// Cleans one cell value for a property. Returns undefined when the cell should be empty.
// Relation and person ids are checked against the database by the caller (they need lookups).
export const cleanValue = (prop: Prop, raw: unknown): unknown => {
    if (raw === null || raw === undefined) return undefined
    switch (prop.type) {
        case "text": case "phone": {
            const s = str(raw, 2000)
            return s === "" ? undefined : s
        }
        case "url": case "email": {
            const s = str(raw, 500).trim()
            return s === "" ? undefined : s
        }
        case "number": {
            const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN
            return Number.isFinite(n) ? n : undefined
        }
        case "checkbox":
            return raw === true ? true : undefined
        case "select": case "status": {
            const id = typeof raw === "string" ? raw : ""
            return prop.options?.some((o) => o.id === id) ? id : undefined
        }
        case "multiSelect": {
            const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : []
            const ok = Array.from(new Set(ids.filter((id) => prop.options?.some((o) => o.id === id)))).slice(0, MAX_OPTIONS)
            return ok.length ? ok : undefined
        }
        case "date": {
            if (!isObj(raw) || !isoOk(raw.start)) return undefined
            const d: DateValue = { start: raw.start }
            if (isoOk(raw.end) && Date.parse(raw.end) >= Date.parse(raw.start)) d.end = raw.end
            return d
        }
        case "person": case "relation": {
            const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && x.length < 40) : []
            const max = prop.type === "relation" && prop.relation?.many === false ? 1 : 100
            const uniq = Array.from(new Set(ids)).slice(0, max)
            return uniq.length ? uniq : undefined
        }
        default:
            return undefined
    }
}

// Keep what still makes sense when a property changes type.
export const convertValue = (from: Prop, to: Prop, v: unknown): unknown => {
    if (v === undefined || v === null) return undefined
    const textual = ["text", "url", "email", "phone"]
    if (textual.includes(from.type) && textual.includes(to.type)) return cleanValue(to, v)
    if (from.type === to.type) return cleanValue(to, v)
    if ((from.type === "select" || from.type === "status") && (to.type === "select" || to.type === "status")) return cleanValue(to, v)
    if ((from.type === "select" || from.type === "status") && to.type === "multiSelect") return cleanValue(to, [v])
    if (from.type === "multiSelect" && (to.type === "select" || to.type === "status") && Array.isArray(v)) return cleanValue(to, v[0])
    if (from.type === "number" && textual.includes(to.type)) return cleanValue(to, String(v))
    if (textual.includes(from.type) && to.type === "number") return cleanValue(to, v)
    if ((from.type === "select" || from.type === "status" || from.type === "multiSelect") && textual.includes(to.type)) {
        const ids = Array.isArray(v) ? v : [v]
        return cleanValue(to, ids.map((id) => from.options?.find((o) => o.id === id)?.name).filter(Boolean).join(", "))
    }
    if (textual.includes(from.type) && (to.type === "select" || to.type === "status" || to.type === "multiSelect")) {
        const names = String(v).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
        const ids = names.map((n) => to.options?.find((o) => o.name.toLowerCase() === n)?.id).filter(Boolean)
        return cleanValue(to, to.type === "multiSelect" ? ids : ids[0])
    }
    return undefined
}
