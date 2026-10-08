// A small, safe formula language for database properties (a friendly subset of what Notion offers).
// Nothing here uses eval: formulas are parsed into a tree and walked.

export class FDate {
  constructor(public ms: number, public end?: number) {}
}
export type FValue = number | string | boolean | null | FDate | FValue[]

export class FormulaError extends Error {}

type Node =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "call"; name: string; args: Node[] }
  | { t: "un"; op: string; a: Node }
  | { t: "bin"; op: string; a: Node; b: Node }
  | { t: "cond"; c: Node; a: Node; b: Node }

type Tok = { k: "num" | "str" | "id" | "op" | "end"; v: string; n?: number }

const MAX_LEN = 2000
const MAX_DEPTH = 60

const tokenize = (src: string): Tok[] => {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      const n = Number(src.slice(i, j))
      if (!Number.isFinite(n)) throw new FormulaError(`Bad number "${src.slice(i, j)}"`)
      out.push({ k: "num", v: src.slice(i, j), n }); i = j; continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      let s = ""
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\" && j + 1 < src.length) {
          const e = src[j + 1]
          s += e === "n" ? "\n" : e === "t" ? "\t" : e
          j += 2
        } else s += src[j++]
      }
      if (src[j] !== c) throw new FormulaError("A quote was never closed")
      out.push({ k: "str", v: s }); i = j + 1; continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      out.push({ k: "id", v: src.slice(i, j) }); i = j; continue
    }
    const two = src.slice(i, i + 2)
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) { out.push({ k: "op", v: two }); i += 2; continue }
    if ("+-*/%^<>=!?:(),".includes(c)) { out.push({ k: "op", v: c }); i++; continue }
    throw new FormulaError(`Unexpected "${c}"`)
  }
  out.push({ k: "end", v: "" })
  return out
}

class Parser {
  i = 0
  depth = 0
  constructor(private toks: Tok[]) {}
  private get cur() { return this.toks[this.i] }
  private is(v: string) { return this.cur.k === "op" && this.cur.v === v }
  private word(v: string) { return this.cur.k === "id" && this.cur.v.toLowerCase() === v }
  private eat(v: string) { if (!this.is(v)) throw new FormulaError(`Expected "${v}"`); this.i++ }

  parse(): Node {
    const n = this.ternary()
    if (this.cur.k !== "end") throw new FormulaError(`Unexpected "${this.cur.v}"`)
    return n
  }
  private guard<T>(fn: () => T): T {
    if (++this.depth > MAX_DEPTH) throw new FormulaError("This formula is nested too deeply")
    try { return fn() } finally { this.depth-- }
  }
  private ternary(): Node {
    return this.guard(() => {
      const c = this.or()
      if (this.is("?")) {
        this.i++
        const a = this.ternary()
        this.eat(":")
        const b = this.ternary()
        return { t: "cond", c, a, b } as Node
      }
      return c
    })
  }
  private or(): Node {
    let a = this.and()
    while (this.is("||") || this.word("or")) { this.i++; a = { t: "bin", op: "||", a, b: this.and() } }
    return a
  }
  private and(): Node {
    let a = this.equality()
    while (this.is("&&") || this.word("and")) { this.i++; a = { t: "bin", op: "&&", a, b: this.equality() } }
    return a
  }
  private equality(): Node {
    let a = this.compare()
    while (this.is("==") || this.is("!=") || this.is("=")) {
      const op = this.cur.v === "=" ? "==" : this.cur.v
      this.i++
      a = { t: "bin", op, a, b: this.compare() }
    }
    return a
  }
  private compare(): Node {
    let a = this.add()
    while (this.is("<") || this.is(">") || this.is("<=") || this.is(">=")) {
      const op = this.cur.v; this.i++
      a = { t: "bin", op, a, b: this.add() }
    }
    return a
  }
  private add(): Node {
    let a = this.mul()
    while (this.is("+") || this.is("-")) { const op = this.cur.v; this.i++; a = { t: "bin", op, a, b: this.mul() } }
    return a
  }
  private mul(): Node {
    let a = this.pow()
    while (this.is("*") || this.is("/") || this.is("%")) { const op = this.cur.v; this.i++; a = { t: "bin", op, a, b: this.pow() } }
    return a
  }
  private pow(): Node {
    const a = this.unary()
    if (this.is("^")) { this.i++; return { t: "bin", op: "^", a, b: this.pow() } }
    return a
  }
  private unary(): Node {
    return this.guard(() => {
      if (this.is("-")) { this.i++; return { t: "un", op: "-", a: this.unary() } as Node }
      if (this.is("!") || this.word("not")) {
        // "not(x)" is also an ordinary function call
        if (this.word("not") && this.toks[this.i + 1]?.v === "(") return this.primary()
        this.i++; return { t: "un", op: "!", a: this.unary() } as Node
      }
      return this.primary()
    })
  }
  private primary(): Node {
    const t = this.cur
    if (t.k === "num") { this.i++; return { t: "num", v: t.n! } }
    if (t.k === "str") { this.i++; return { t: "str", v: t.v } }
    if (t.k === "op" && t.v === "(") { this.i++; const n = this.ternary(); this.eat(")"); return n }
    if (t.k === "id") {
      this.i++
      const low = t.v.toLowerCase()
      if (this.is("(")) {
        this.i++
        const args: Node[] = []
        if (!this.is(")")) {
          do { args.push(this.ternary()) } while (this.is(",") && ++this.i)
        }
        this.eat(")")
        return { t: "call", name: low, args }
      }
      if (low === "true") return { t: "bool", v: true }
      if (low === "false") return { t: "bool", v: false }
      throw new FormulaError(`"${t.v}" isn't a function. Use prop("Name") to read a property`)
    }
    throw new FormulaError(this.cur.k === "end" ? "The formula ends too soon" : `Unexpected "${this.cur.v}"`)
  }
}

const cache = new Map<string, Node>()
export const parseFormula = (src: string): Node => {
  if (src.length > MAX_LEN) throw new FormulaError("This formula is too long")
  const hit = cache.get(src)
  if (hit) return hit
  const node = new Parser(tokenize(src)).parse()
  if (cache.size > 300) cache.clear()
  cache.set(src, node)
  return node
}

// ---- values ----

const DAY = 86_400_000

export const isEmptyValue = (v: FValue): boolean =>
  v === null || v === "" || (Array.isArray(v) && v.length === 0)

export const toStr = (v: FValue): string => {
  if (v === null) return ""
  if (typeof v === "string") return v
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e10) / 1e10)
  if (typeof v === "boolean") return v ? "true" : "false"
  if (v instanceof FDate) return fmtDate(v.ms, "YYYY-MM-DD")
  return v.map(toStr).join(", ")
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0")
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
export const fmtDate = (ms: number, fmt: string) => {
  const d = new Date(ms)
  return fmt
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MMMM/g, MONTHS[d.getMonth()])
    .replace(/MMM/g, MONTHS[d.getMonth()].slice(0, 3))
    .replace(/MM/g, pad(d.getMonth() + 1))
    .replace(/DD/g, pad(d.getDate()))
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()))
}

const num = (v: FValue, what = "a number"): number => {
  if (typeof v === "number") return v
  if (typeof v === "boolean") return v ? 1 : 0
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  if (v === null) return 0
  throw new FormulaError(`Expected ${what}`)
}
const truthy = (v: FValue) => v === true || (typeof v === "number" && v !== 0) || (typeof v === "string" && v !== "") || (Array.isArray(v) && v.length > 0) || v instanceof FDate
const flat = (args: FValue[]): FValue[] => args.flatMap((a) => (Array.isArray(a) ? flat(a) : [a]))
const nums = (args: FValue[]) => flat(args).filter((x) => x !== null && x !== "").map((x) => num(x))
const date = (v: FValue): FDate => {
  if (v instanceof FDate) return v
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new FDate(Date.parse(v))
  if (typeof v === "number") return new FDate(v)
  throw new FormulaError("Expected a date")
}
const UNITS: Record<string, number> = { years: 365 * DAY, quarters: 91 * DAY, months: 30 * DAY, weeks: 7 * DAY, days: DAY, hours: 3_600_000, minutes: 60_000, seconds: 1000 }
const unitOf = (v: FValue) => {
  const k = toStr(v).toLowerCase()
  const u = k.endsWith("s") ? k : `${k}s`
  if (!(u in UNITS)) throw new FormulaError(`Unknown unit "${toStr(v)}". Use years, months, weeks, days, hours or minutes`)
  return u
}
const addUnits = (d: FDate, n: number, u: string) => {
  const dt = new Date(d.ms)
  if (u === "years") dt.setFullYear(dt.getFullYear() + n)
  else if (u === "quarters") dt.setMonth(dt.getMonth() + n * 3)
  else if (u === "months") dt.setMonth(dt.getMonth() + n)
  else dt.setTime(dt.getTime() + n * UNITS[u])
  return new FDate(dt.getTime(), d.end)
}
const equal = (a: FValue, b: FValue): boolean => {
  if (a instanceof FDate && b instanceof FDate) return a.ms === b.ms
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => equal(x, b[i]))
  if (a === null || b === null) return isEmptyValue(a) && isEmptyValue(b)
  return a === b
}
const cmp = (a: FValue, b: FValue): number => {
  if (a instanceof FDate && b instanceof FDate) return a.ms - b.ms
  if (typeof a === "number" && typeof b === "number") return a - b
  return toStr(a).localeCompare(toStr(b))
}

type Fn = (args: FValue[]) => FValue
const FUNCS: Record<string, Fn> = {
  not: ([a]) => !truthy(a ?? null),
  and: (a) => a.every(truthy),
  or: (a) => a.some(truthy),
  empty: ([a]) => isEmptyValue(a ?? null),
  equal: ([a, b]) => equal(a ?? null, b ?? null),
  unequal: ([a, b]) => !equal(a ?? null, b ?? null),
  length: ([a]) => (Array.isArray(a) ? a.length : toStr(a ?? null).length),
  concat: (a) => a.map(toStr).join(""),
  join: ([l, s]) => (Array.isArray(l) ? l : [l ?? null]).map(toStr).join(s === undefined ? ", " : toStr(s)),
  lower: ([a]) => toStr(a ?? null).toLowerCase(),
  upper: ([a]) => toStr(a ?? null).toUpperCase(),
  trim: ([a]) => toStr(a ?? null).trim(),
  replace: ([s, f, r]) => toStr(s ?? null).replace(toStr(f ?? null), () => toStr(r ?? null)),
  replaceall: ([s, f, r]) => (toStr(f ?? null) === "" ? toStr(s ?? null) : toStr(s ?? null).split(toStr(f ?? null)).join(toStr(r ?? null))),
  contains: ([a, b]) => (Array.isArray(a) ? a.some((x) => equal(x, b ?? null)) : toStr(a ?? null).toLowerCase().includes(toStr(b ?? null).toLowerCase())),
  startswith: ([a, b]) => toStr(a ?? null).toLowerCase().startsWith(toStr(b ?? null).toLowerCase()),
  endswith: ([a, b]) => toStr(a ?? null).toLowerCase().endsWith(toStr(b ?? null).toLowerCase()),
  slice: ([s, a, b]) => {
    const start = num(a ?? 0), end = b === undefined ? undefined : num(b)
    return Array.isArray(s) ? s.slice(start, end) : toStr(s ?? null).slice(start, end)
  },
  repeat: ([s, n]) => {
    const t = toStr(s ?? null), k = Math.max(0, Math.min(1000, Math.floor(num(n ?? 0))))
    if (t.length * k > 10_000) throw new FormulaError("That would be too long")
    return t.repeat(k)
  },
  format: ([a]) => toStr(a ?? null),
  tonumber: ([a]) => {
    if (typeof a === "number") return a
    if (a instanceof FDate) return a.ms
    const n = Number(toStr(a ?? null).replace(/[^0-9.\-eE]/g, ""))
    return Number.isFinite(n) ? n : null
  },
  abs: ([a]) => Math.abs(num(a ?? 0)),
  ceil: ([a]) => Math.ceil(num(a ?? 0)),
  floor: ([a]) => Math.floor(num(a ?? 0)),
  round: ([a, d]) => { const k = 10 ** Math.max(0, Math.min(10, Math.floor(num(d ?? 0)))); return Math.round(num(a ?? 0) * k) / k },
  sqrt: ([a]) => { const n = num(a ?? 0); if (n < 0) throw new FormulaError("Can't take the square root of a negative number"); return Math.sqrt(n) },
  pow: ([a, b]) => num(a ?? 0) ** num(b ?? 0),
  mod: ([a, b]) => { const d = num(b ?? 0); if (d === 0) throw new FormulaError("Can't divide by zero"); return num(a ?? 0) % d },
  sign: ([a]) => Math.sign(num(a ?? 0)),
  ln: ([a]) => Math.log(num(a ?? 0)),
  log10: ([a]) => Math.log10(num(a ?? 0)),
  exp: ([a]) => Math.exp(num(a ?? 0)),
  min: (a) => { const n = nums(a); return n.length ? Math.min(...n) : null },
  max: (a) => { const n = nums(a); return n.length ? Math.max(...n) : null },
  sum: (a) => nums(a).reduce((x, y) => x + y, 0),
  mean: (a) => { const n = nums(a); return n.length ? n.reduce((x, y) => x + y, 0) / n.length : null },
  median: (a) => { const n = nums(a).sort((x, y) => x - y); if (!n.length) return null; const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2 },
  now: () => new FDate(Date.now()),
  today: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return new FDate(d.getTime()) },
  dateadd: ([d, n, u]) => addUnits(date(d ?? null), num(n ?? 0), unitOf(u ?? "days")),
  datesubtract: ([d, n, u]) => addUnits(date(d ?? null), -num(n ?? 0), unitOf(u ?? "days")),
  datebetween: ([a, b, u]) => {
    const unit = unitOf(u ?? "days")
    const diff = date(a ?? null).ms - date(b ?? null).ms
    if (unit === "months" || unit === "years" || unit === "quarters") {
      const x = new Date(date(a ?? null).ms), y = new Date(date(b ?? null).ms)
      const months = (x.getFullYear() - y.getFullYear()) * 12 + (x.getMonth() - y.getMonth())
      return Math.trunc(unit === "months" ? months : unit === "quarters" ? months / 3 : months / 12)
    }
    return Math.trunc(diff / UNITS[unit])
  },
  formatdate: ([d, f]) => fmtDate(date(d ?? null).ms, f === undefined ? "MMM DD, YYYY" : toStr(f)),
  year: ([d]) => new Date(date(d ?? null).ms).getFullYear(),
  month: ([d]) => new Date(date(d ?? null).ms).getMonth() + 1,
  date: ([d]) => new Date(date(d ?? null).ms).getDate(),
  day: ([d]) => { const w = new Date(date(d ?? null).ms).getDay(); return w === 0 ? 7 : w },
  hour: ([d]) => new Date(date(d ?? null).ms).getHours(),
  minute: ([d]) => new Date(date(d ?? null).ms).getMinutes(),
  timestamp: ([d]) => date(d ?? null).ms,
  fromtimestamp: ([n]) => new FDate(num(n ?? 0)),
  datestart: ([d]) => new FDate(date(d ?? null).ms),
  dateend: ([d]) => { const x = date(d ?? null); return new FDate(x.end ?? x.ms) },
  at: ([l, i]) => (Array.isArray(l) ? (l[Math.floor(num(i ?? 0))] ?? null) : null),
  first: ([l]) => (Array.isArray(l) ? (l[0] ?? null) : (l ?? null)),
  last: ([l]) => (Array.isArray(l) ? (l[l.length - 1] ?? null) : (l ?? null)),
  sort: ([l]) => (Array.isArray(l) ? [...l].sort(cmp) : (l ?? null)),
  reverse: ([l]) => (Array.isArray(l) ? [...l].reverse() : (l ?? null)),
  unique: ([l]) => (Array.isArray(l) ? l.filter((x, i) => l.findIndex((y) => equal(x, y)) === i) : (l ?? null)),
  flat: ([l]) => flat([l ?? null]),
}

export const FORMULA_FUNCTIONS = Object.keys(FUNCS).concat(["if", "ifs", "prop"]).sort()

export type FormulaEnv = { prop: (name: string) => FValue }

const evalNode = (n: Node, env: FormulaEnv, budget: { n: number }): FValue => {
  if (++budget.n > 5000) throw new FormulaError("This formula is too complex")
  switch (n.t) {
    case "num": return n.v
    case "str": return n.v
    case "bool": return n.v
    case "cond": return truthy(evalNode(n.c, env, budget)) ? evalNode(n.a, env, budget) : evalNode(n.b, env, budget)
    case "un": {
      const a = evalNode(n.a, env, budget)
      return n.op === "-" ? -num(a) : !truthy(a)
    }
    case "bin": {
      if (n.op === "&&") return truthy(evalNode(n.a, env, budget)) && truthy(evalNode(n.b, env, budget))
      if (n.op === "||") return truthy(evalNode(n.a, env, budget)) || truthy(evalNode(n.b, env, budget))
      const a = evalNode(n.a, env, budget), b = evalNode(n.b, env, budget)
      switch (n.op) {
        case "+":
          if (a instanceof FDate && typeof b === "number") return new FDate(a.ms + b * DAY, a.end)
          if (typeof a === "number" && typeof b === "number") return a + b
          if (typeof a === "string" || typeof b === "string") return toStr(a) + toStr(b)
          return num(a) + num(b)
        case "-":
          if (a instanceof FDate && typeof b === "number") return new FDate(a.ms - b * DAY, a.end)
          return num(a) - num(b)
        case "*": return num(a) * num(b)
        case "/": { const d = num(b); if (d === 0) throw new FormulaError("Can't divide by zero"); return num(a) / d }
        case "%": { const d = num(b); if (d === 0) throw new FormulaError("Can't divide by zero"); return num(a) % d }
        case "^": return num(a) ** num(b)
        case "==": return equal(a, b)
        case "!=": return !equal(a, b)
        case "<": return cmp(a, b) < 0
        case ">": return cmp(a, b) > 0
        case "<=": return cmp(a, b) <= 0
        default: return cmp(a, b) >= 0
      }
    }
    case "call": {
      if (n.name === "prop") {
        if (n.args.length !== 1) throw new FormulaError('prop() takes one name, like prop("Status")')
        return env.prop(toStr(evalNode(n.args[0], env, budget)))
      }
      if (n.name === "if") {
        if (n.args.length < 2) throw new FormulaError("if() needs a condition and a value")
        return truthy(evalNode(n.args[0], env, budget)) ? evalNode(n.args[1], env, budget) : n.args[2] ? evalNode(n.args[2], env, budget) : null
      }
      if (n.name === "ifs") {
        for (let i = 0; i + 1 < n.args.length; i += 2) if (truthy(evalNode(n.args[i], env, budget))) return evalNode(n.args[i + 1], env, budget)
        return n.args.length % 2 ? evalNode(n.args[n.args.length - 1], env, budget) : null
      }
      const fn = FUNCS[n.name]
      if (!fn) throw new FormulaError(`Unknown function "${n.name}"`)
      return fn(n.args.map((a) => evalNode(a, env, budget)))
    }
  }
}

export const evaluateFormula = (src: string, env: FormulaEnv): FValue => {
  if (!src.trim()) return null
  return evalNode(parseFormula(src), env, { n: 0 })
}
