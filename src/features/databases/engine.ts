import type { Prop, View, Condition, Option, DateValue, NumberFormat, RollupFn } from "../../../convex/dbTypes"
import { evaluateFormula, FDate, FormulaError, toStr, FValue } from "./formula"

export type Row = {
  _id: string
  title: string
  values: Record<string, unknown>
  position: number
  createdAt: number
  createdBy: string
  updatedAt: number
  updatedBy: string | null
  roomId: string
  hasBody: boolean
}

export type MemberLite = { id: string; name: string; image?: string }

export type Related = { props: Prop[]; rows: Row[] }

export type Env = {
  props: Prop[]
  members: Map<string, MemberLite>
  related: Map<string, Related>
}

export const TITLE: Prop = { id: "title", name: "Name", type: "text" }

export type Err = { __error: string }
export const isErr = (v: unknown): v is Err => !!v && typeof v === "object" && "__error" in (v as object)

// ---- dates ----

export const parseDateMs = (s: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
  return Date.parse(s)
}
export const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime() }
const DAY = 86_400_000
export const toDateStr = (ms: number) => {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const hasTime = (s: string) => s.includes("T")

export const fmtDateValue = (v: DateValue | undefined): string => {
  if (!v) return ""
  const f = (s: string) => {
    const ms = parseDateMs(s)
    return hasTime(s)
      ? new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  }
  return v.end ? `${f(v.start)} → ${f(v.end)}` : f(v.start)
}

// ---- numbers ----

export const fmtNumber = (n: number, f: NumberFormat = "number"): string => {
  if (!Number.isFinite(n)) return ""
  try {
    if (f === "percent") return `${Math.round(n * 10000) / 100}%`
    if (f === "usd" || f === "eur" || f === "gbp") return new Intl.NumberFormat(undefined, { style: "currency", currency: f.toUpperCase(), maximumFractionDigits: 2 }).format(n)
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(n)
  } catch { return String(n) }
}

// ---- property kinds ----

export type Kind = "text" | "number" | "select" | "multiSelect" | "date" | "person" | "checkbox" | "relation" | "computed"
export const kindOf = (p: Prop): Kind => {
  switch (p.type) {
    case "text": case "url": case "email": case "phone": return "text"
    case "number": return "number"
    case "select": case "status": return "select"
    case "multiSelect": return "multiSelect"
    case "date": case "createdTime": case "lastEdited": return "date"
    case "person": case "createdBy": return "person"
    case "checkbox": return "checkbox"
    case "relation": return "relation"
    default: return "computed"
  }
}

export const optionOf = (p: Prop, id: unknown) => p.options?.find((o) => o.id === id)

// ---- computing values ----

type Computer = {
  valueOf: (row: Row, propId: string) => unknown
  display: (row: Row, prop: Prop) => string
}

const DONE = Symbol("done")
const BUSY = Symbol("busy")

export const rollupResult = (fn: RollupFn, targetProp: Prop, vals: unknown[], total: number, display: (v: unknown) => string): unknown => {
  const empty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) || v === false
  const numbers = () => vals.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
  const dates = () => vals.map((v) => (v && typeof v === "object" && "start" in (v as object) ? parseDateMs((v as DateValue).start) : typeof v === "number" ? v : NaN)).filter((n) => Number.isFinite(n))
  switch (fn) {
    case "count": return total
    case "countValues": return vals.filter((v) => !empty(v)).length
    case "countUnique": return new Set(vals.filter((v) => !empty(v)).map((v) => JSON.stringify(v))).size
    case "countEmpty": return vals.filter(empty).length
    case "percentEmpty": return total ? vals.filter(empty).length / total : 0
    case "percentNotEmpty": return total ? vals.filter((v) => !empty(v)).length / total : 0
    case "sum": return numbers().reduce((a, b) => a + b, 0)
    case "average": { const n = numbers(); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null }
    case "median": { const n = numbers().sort((a, b) => a - b); if (!n.length) return null; const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2 }
    case "min": { const n = numbers(); return n.length ? Math.min(...n) : null }
    case "max": { const n = numbers(); return n.length ? Math.max(...n) : null }
    case "range": { const n = numbers(); if (n.length) return Math.max(...n) - Math.min(...n); const d = dates(); return d.length ? Math.round((Math.max(...d) - Math.min(...d)) / DAY) : null }
    case "earliest": { const d = dates(); return d.length ? { start: toDateStr(Math.min(...d)) } : null }
    case "latest": { const d = dates(); return d.length ? { start: toDateStr(Math.max(...d)) } : null }
    case "checked": return vals.filter((v) => v === true).length
    case "unchecked": return total - vals.filter((v) => v === true).length
    case "percentChecked": return total ? vals.filter((v) => v === true).length / total : 0
    default: return vals.filter((v) => !empty(v)).map(display).filter(Boolean)
  }
}

export const makeComputer = (env: Env, depth = 0): Computer => {
  const memo = new Map<string, unknown>()
  const state = new Map<string, symbol>()
  const relatedCache = new Map<string, { byId: Map<string, Row>; computer: Computer; props: Prop[] }>()

  const relatedFor = (dbId: string) => {
    let c = relatedCache.get(dbId)
    if (!c) {
      const rel = env.related.get(dbId)
      if (!rel) return null
      c = {
        byId: new Map(rel.rows.map((r) => [r._id, r])),
        props: rel.props,
        // follows relations from related databases too, up to three hops
        computer: makeComputer({ props: rel.props, members: env.members, related: depth >= 2 ? new Map() : env.related }, depth + 1),
      }
      relatedCache.set(dbId, c)
    }
    return c
  }

  const nameOfMember = (id: string) => env.members.get(id)?.name ?? "Unknown"

  const relationTitles = (prop: Prop, ids: string[]) => {
    const rel = prop.relation && relatedFor(prop.relation.databaseId)
    return ids.map((id) => rel?.byId.get(id)?.title).filter((t): t is string => !!t)
  }

  const display = (row: Row, prop: Prop): string => {
    const v = valueOf(row, prop.id)
    return displayRaw(prop, v)
  }

  const displayRaw = (prop: Prop, v: unknown): string => {
    if (isErr(v)) return "Error"
    if (v === undefined || v === null) return ""
    switch (prop.type) {
      case "select": case "status": return optionOf(prop, v)?.name ?? ""
      case "multiSelect": return (v as string[]).map((id) => optionOf(prop, id)?.name).filter(Boolean).join(", ")
      case "date": return fmtDateValue(v as DateValue)
      case "createdTime": case "lastEdited": return fmtDateValue({ start: new Date(v as number).toISOString() })
      case "person": return (v as string[]).map(nameOfMember).join(", ")
      case "createdBy": return nameOfMember(v as string)
      case "relation": return relationTitles(prop, v as string[]).join(", ")
      case "number": return fmtNumber(v as number, prop.numberFormat)
      case "checkbox": return v ? "Yes" : "No"
      case "formula": return fromFValue(v as FValue)
      case "rollup": return rollupText(prop, v)
      default: return String(v)
    }
  }

  const fromFValue = (v: FValue): string => (v instanceof FDate ? fmtDateValue({ start: new Date(v.ms).toISOString() }) : toStr(v))

  const rollupText = (prop: Prop, v: unknown): string => {
    if (v === null || v === undefined) return ""
    if (typeof v === "number") {
      const fn = prop.rollup?.fn
      return fn === "percentEmpty" || fn === "percentNotEmpty" || fn === "percentChecked" ? fmtNumber(v, "percent") : fmtNumber(v)
    }
    if (Array.isArray(v)) return v.join(", ")
    if (typeof v === "object" && "start" in (v as object)) return fmtDateValue(v as DateValue)
    return String(v)
  }

  // typed value -> formula value
  const toF = (prop: Prop, v: unknown): FValue => {
    if (v === undefined || v === null) return prop.type === "checkbox" ? false : null
    switch (prop.type) {
      case "number": case "text": case "url": case "email": case "phone": return v as number | string
      case "checkbox": return !!v
      case "select": case "status": return optionOf(prop, v)?.name ?? null
      case "multiSelect": return (v as string[]).map((id) => optionOf(prop, id)?.name ?? "")
      case "date": { const d = v as DateValue; return new FDate(parseDateMs(d.start), d.end ? parseDateMs(d.end) : undefined) }
      case "createdTime": case "lastEdited": return new FDate(v as number)
      case "person": return (v as string[]).map(nameOfMember)
      case "createdBy": return nameOfMember(v as string)
      case "relation": return relationTitles(prop, v as string[])
      case "formula": return v as FValue
      case "rollup": {
        if (typeof v === "object" && !Array.isArray(v) && "start" in (v as object)) return new FDate(parseDateMs((v as DateValue).start))
        return v as FValue
      }
      default: return null
    }
  }

  const valueOf = (row: Row, propId: string): unknown => {
    const key = `${row._id}:${propId}`
    if (memo.has(key)) return memo.get(key)
    if (propId === "title") return row.title
    const prop = env.props.find((p) => p.id === propId)
    if (!prop) return undefined
    let out: unknown
    switch (prop.type) {
      case "createdTime": out = row.createdAt; break
      case "lastEdited": out = row.updatedAt; break
      case "createdBy": out = row.createdBy; break
      case "formula": {
        if (state.get(key) === BUSY) return { __error: "Circular reference" } satisfies Err
        state.set(key, BUSY)
        try {
          out = evaluateFormula(prop.formula ?? "", {
            prop: (name) => {
              if (name === "Name" || name === "title") return row.title
              const p = env.props.find((x) => x.name === name) ?? env.props.find((x) => x.name.toLowerCase() === name.toLowerCase())
              if (!p) throw new FormulaError(`There's no property called "${name}"`)
              const raw = valueOf(row, p.id)
              if (isErr(raw)) throw new FormulaError(raw.__error)
              return toF(p, raw)
            },
          })
        } catch (e) {
          out = { __error: e instanceof FormulaError ? e.message : "Couldn't calculate this" } satisfies Err
        }
        state.set(key, DONE)
        break
      }
      case "rollup": {
        const cfg = prop.rollup
        const rel = cfg && env.props.find((p) => p.id === cfg.relationId && p.type === "relation")
        const target = rel?.relation ? relatedFor(rel.relation.databaseId) : null
        if (!cfg || !rel || !target) { out = null; break }
        const ids = (valueOf(row, rel.id) as string[] | undefined) ?? []
        const trows = ids.map((id) => target.byId.get(id)).filter((r): r is Row => !!r)
        const tprop = cfg.targetId === "title" ? TITLE : target.props.find((p) => p.id === cfg.targetId)
        if (!tprop) { out = null; break }
        const vals = trows.map((r) => target.computer.valueOf(r, tprop.id))
        out = rollupResult(cfg.fn, tprop, vals, trows.length, (v) => target.computer.display({ ...trows[0], values: {} } as Row, tprop) && displayVia(target, tprop, v))
        break
      }
      case "checkbox": out = row.values[propId] === true; break
      default: out = row.values[propId]
    }
    memo.set(key, out)
    return out
  }

  const displayVia = (target: { computer: Computer }, tprop: Prop, v: unknown) => {
    // render one related value with the related database's own formatting
    const fake: Row = { _id: "x", title: "", values: {}, position: 0, createdAt: 0, createdBy: "", updatedAt: 0, updatedBy: null, roomId: "", hasBody: false }
    if (tprop.id === "title") return String(v ?? "")
    const c = target.computer as Computer & { raw?: (p: Prop, v: unknown) => string }
    return c.raw ? c.raw(tprop, v) : String(v ?? "") + (fake ? "" : "")
  }

  const computer: Computer & { raw: (p: Prop, v: unknown) => string } = { valueOf, display, raw: displayRaw }
  return computer
}

// Footer calculation for one column of a table.
export const summarize = (rows: Row[], prop: Prop, fn: RollupFn, comp: Computer): string => {
  const vals = rows.map((r) => comp.valueOf(r, prop.id))
  const out = rollupResult(fn, prop, vals, rows.length, (v) => String(v ?? ""))
  if (out === null || out === undefined) return ""
  if (typeof out === "number") {
    if (fn === "percentEmpty" || fn === "percentNotEmpty" || fn === "percentChecked") return fmtNumber(out, "percent")
    const money = ["sum", "average", "median", "min", "max", "range"].includes(fn) && prop.type === "number"
    return fmtNumber(out, money ? prop.numberFormat : "number")
  }
  if (typeof out === "object" && "start" in (out as object)) return fmtDateValue(out as DateValue)
  return Array.isArray(out) ? out.join(", ") : String(out)
}

// ---- filtering ----

export type OpDef = { id: string; label: string; needsValue: boolean }
const op = (id: string, label: string, needsValue = true): OpDef => ({ id, label, needsValue })

const TEXT_OPS = [op("contains", "contains"), op("notContains", "does not contain"), op("is", "is"), op("isNot", "is not"), op("startsWith", "starts with"), op("endsWith", "ends with"), op("isEmpty", "is empty", false), op("isNotEmpty", "is not empty", false)]
const NUM_OPS = [op("eq", "="), op("neq", "≠"), op("gt", ">"), op("gte", "≥"), op("lt", "<"), op("lte", "≤"), op("isEmpty", "is empty", false), op("isNotEmpty", "is not empty", false)]
const SEL_OPS = [op("is", "is"), op("isNot", "is not"), op("isEmpty", "is empty", false), op("isNotEmpty", "is not empty", false)]
const MULTI_OPS = [op("contains", "contains"), op("notContains", "does not contain"), op("isEmpty", "is empty", false), op("isNotEmpty", "is not empty", false)]
const DATE_OPS = [op("is", "is"), op("before", "is before"), op("after", "is after"), op("onOrBefore", "is on or before"), op("onOrAfter", "is on or after"), op("thisWeek", "is this week", false), op("pastWeek", "is in the past week", false), op("nextWeek", "is in the next week", false), op("pastMonth", "is in the past month", false), op("nextMonth", "is in the next month", false), op("isEmpty", "is empty", false), op("isNotEmpty", "is not empty", false)]
const CHECK_OPS = [op("isChecked", "is checked", false), op("isUnchecked", "is not checked", false)]
const COMPUTED_OPS = [op("contains", "contains"), op("is", "is"), op("isNot", "is not"), op("gt", ">"), op("lt", "<"), op("isEmpty", "is empty", false), op("isNotEmpty", "is not empty", false)]

export const opsFor = (p: Prop): OpDef[] => {
  switch (kindOf(p)) {
    case "text": return TEXT_OPS
    case "number": return NUM_OPS
    case "select": return SEL_OPS
    case "multiSelect": case "person": case "relation": return MULTI_OPS
    case "date": return DATE_OPS
    case "checkbox": return CHECK_OPS
    default: return COMPUTED_OPS
  }
}

const isEmptyRaw = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)

const dateTarget = (value: unknown): number => {
  const s = typeof value === "string" ? value : "today"
  if (s === "today") return startOfDay(Date.now())
  if (s === "yesterday") return startOfDay(Date.now() - DAY)
  if (s === "tomorrow") return startOfDay(Date.now() + DAY)
  const ms = parseDateMs(s)
  return Number.isFinite(ms) ? startOfDay(ms) : startOfDay(Date.now())
}

export const matchCondition = (row: Row, c: Condition, env: Env, comp: Computer): boolean => {
  const prop = c.propId === "title" ? TITLE : env.props.find((p) => p.id === c.propId)
  if (!prop) return true
  const raw = comp.valueOf(row, prop.id)
  const kind = c.propId === "title" ? "text" : kindOf(prop)
  const val = c.value
  if (c.op === "isEmpty") return isEmptyRaw(raw) || raw === false && kind === "checkbox"
  if (c.op === "isNotEmpty") return !isEmptyRaw(raw)
  const text = (comp.display(row, prop) ?? "").toLowerCase()
  const needle = String(val ?? "").toLowerCase()
  switch (kind) {
    case "text": {
      const t = c.propId === "title" ? row.title.toLowerCase() : text
      switch (c.op) {
        case "contains": return t.includes(needle)
        case "notContains": return !t.includes(needle)
        case "is": return t === needle
        case "isNot": return t !== needle
        case "startsWith": return t.startsWith(needle)
        case "endsWith": return t.endsWith(needle)
      }
      return true
    }
    case "number": {
      if (val === undefined || val === "") return true
      const n = Number(val)
      const x = typeof raw === "number" ? raw : NaN
      if (!Number.isFinite(x)) return c.op === "neq"
      switch (c.op) {
        case "eq": return x === n
        case "neq": return x !== n
        case "gt": return x > n
        case "gte": return x >= n
        case "lt": return x < n
        case "lte": return x <= n
      }
      return true
    }
    case "select":
      return c.op === "is" ? raw === val : c.op === "isNot" ? raw !== val : true
    case "multiSelect": case "person": case "relation": {
      const arr = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
      const target = val === "me" && kind === "person" ? env.members.get("__me__")?.id ?? val : val
      if (c.op === "contains") return arr.includes(target)
      if (c.op === "notContains") return !arr.includes(target)
      return true
    }
    case "checkbox":
      return c.op === "isChecked" ? raw === true : raw === false || raw === undefined
    case "date": {
      const dv: DateValue | undefined = prop.type === "date"
        ? (raw as DateValue | undefined)
        : typeof raw === "number" ? { start: new Date(raw).toISOString() } : undefined
      if (!dv) return false
      const s = startOfDay(parseDateMs(dv.start))
      const e = startOfDay(parseDateMs(dv.end ?? dv.start))
      const today = startOfDay(Date.now())
      switch (c.op) {
        case "is": { const t = dateTarget(val); return s <= t && t <= e }
        case "before": return s < dateTarget(val)
        case "after": return e > dateTarget(val)
        case "onOrBefore": return s <= dateTarget(val)
        case "onOrAfter": return e >= dateTarget(val)
        case "thisWeek": { const d = new Date(today).getDay(); const mon = today - ((d + 6) % 7) * DAY; return s <= mon + 6 * DAY && e >= mon }
        case "pastWeek": return e >= today - 7 * DAY && s <= today
        case "nextWeek": return s <= today + 7 * DAY && e >= today
        case "pastMonth": return e >= today - 30 * DAY && s <= today
        case "nextMonth": return s <= today + 30 * DAY && e >= today
      }
      return true
    }
    default: {
      // formulas and rollups: compare as numbers when both sides are, else as text
      const n = typeof raw === "number" ? raw : NaN
      const vn = Number(val)
      switch (c.op) {
        case "contains": return text.includes(needle)
        case "is": return Number.isFinite(n) && Number.isFinite(vn) && val !== "" ? n === vn : text === needle
        case "isNot": return Number.isFinite(n) && Number.isFinite(vn) && val !== "" ? n !== vn : text !== needle
        case "gt": return Number.isFinite(n) && n > vn
        case "lt": return Number.isFinite(n) && n < vn
      }
      return true
    }
  }
}

export const applyFilter = (rows: Row[], view: View, env: Env, comp: Computer): Row[] => {
  const cs = view.filter.conditions.filter((c) => {
    const o = (c.propId === "title" ? TEXT_OPS : opsFor(env.props.find((p) => p.id === c.propId) ?? TITLE)).find((x) => x.id === c.op)
    return o && (!o.needsValue || (c.value !== undefined && c.value !== ""))
  })
  if (!cs.length) return rows
  return rows.filter((r) => view.filter.match === "or" ? cs.some((c) => matchCondition(r, c, env, comp)) : cs.every((c) => matchCondition(r, c, env, comp)))
}

// ---- sorting & grouping ----

const sortKey = (row: Row, prop: Prop, env: Env, comp: Computer): string | number | null => {
  const raw = comp.valueOf(row, prop.id)
  if (isEmptyRaw(raw) && prop.type !== "checkbox") return null
  switch (kindOf(prop)) {
    case "number": return typeof raw === "number" ? raw : null
    case "checkbox": return raw ? 1 : 0
    case "select": return (prop.options ?? []).findIndex((o) => o.id === raw)
    case "date": return typeof raw === "number" ? raw : raw && typeof raw === "object" && "start" in (raw as object) ? parseDateMs((raw as DateValue).start) : null
    case "computed":
      if (typeof raw === "number") return raw
      if (raw && typeof raw === "object" && "start" in (raw as object)) return parseDateMs((raw as DateValue).start)
      return comp.display(row, prop).toLowerCase()
    default: return comp.display(row, prop).toLowerCase()
  }
}

export const applySorts = (rows: Row[], view: View, env: Env, comp: Computer): Row[] => {
  if (!view.sorts.length) return rows
  const specs = view.sorts.map((s) => ({ prop: s.propId === "title" ? TITLE : env.props.find((p) => p.id === s.propId), dir: s.dir === "desc" ? -1 : 1 })).filter((s): s is { prop: Prop; dir: 1 | -1 } => !!s.prop)
  if (!specs.length) return rows
  const keyed = rows.map((r) => ({ r, k: specs.map((s) => sortKey(r, s.prop, env, comp)) }))
  keyed.sort((a, b) => {
    for (let i = 0; i < specs.length; i++) {
      const x = a.k[i], y = b.k[i]
      if (x === y) continue
      if (x === null) return 1       // empty values always last
      if (y === null) return -1
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
      if (c !== 0) return c * specs[i].dir
    }
    return a.r.position - b.r.position
  })
  return keyed.map((x) => x.r)
}

export type Group = { key: string; label: string; option?: Option; rows: Row[] }

export const groupable = (p: Prop) => ["select", "status", "multiSelect", "person", "checkbox", "date", "text", "number", "createdBy"].includes(p.type)

export const groupKeys = (row: Row, prop: Prop, comp: Computer): string[] => {
  const raw = comp.valueOf(row, prop.id)
  if (isEmptyRaw(raw) && prop.type !== "checkbox") return [""]
  switch (prop.type) {
    case "multiSelect": case "person": return (raw as string[]).length ? (raw as string[]) : [""]
    case "checkbox": return [raw ? "true" : "false"]
    case "date": return [toDateStr(parseDateMs((raw as DateValue).start))]
    default: return [String(raw)]
  }
}

export const groupRows = (rows: Row[], prop: Prop, env: Env, comp: Computer, opts: { showEmpty?: boolean } = {}): Group[] => {
  const map = new Map<string, Row[]>()
  for (const r of rows) for (const k of groupKeys(r, prop, comp)) { const a = map.get(k); if (a) a.push(r); else map.set(k, [r]) }
  const labelOf = (k: string): string => {
    if (k === "") return "No value"
    if (prop.type === "checkbox") return k === "true" ? "Checked" : "Unchecked"
    if (prop.type === "person" || prop.type === "createdBy") return env.members.get(k)?.name ?? "Unknown"
    if (prop.type === "date") return fmtDateValue({ start: k })
    if (prop.options) return optionOf(prop, k)?.name ?? k
    if (prop.type === "number") return fmtNumber(Number(k), prop.numberFormat)
    return k
  }
  let keys: string[]
  if (prop.options) {
    keys = prop.options.map((o) => o.id)
    if (opts.showEmpty !== false) { /* keep empty option columns */ } else keys = keys.filter((k) => map.has(k))
    keys.push("")
    for (const k of map.keys()) if (!keys.includes(k)) keys.push(k)
  } else {
    keys = [...map.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, undefined, { numeric: true })))
  }
  if (prop.type === "checkbox") keys = ["false", "true"]
  return keys.map((k) => ({ key: k, label: labelOf(k), option: prop.options?.find((o) => o.id === k), rows: map.get(k) ?? [] }))
}

// What to store in a row when it is dropped into a group.
export const valueForGroup = (prop: Prop, key: string): unknown => {
  if (prop.type === "checkbox") return key === "true"
  if (key === "") return null
  if (prop.type === "multiSelect" || prop.type === "person") return [key]
  if (prop.type === "date") return { start: key }
  if (prop.type === "number") return Number(key)
  return key
}
