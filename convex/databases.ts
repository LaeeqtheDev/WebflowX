import { v, ConvexError } from "convex/values"
import { mutation, query, internalMutation, MutationCtx, QueryCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { Doc, Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { assert2fa, can } from "./permissions"
import { PLANS, getPlan, checkLimitLazy } from "./limits"
import { throttle } from "./rateLimit"
import { countLiveDocs } from "./docs"
import {
    Prop, View, MAX_PROPS, MAX_VIEWS, MAX_ROWS_PER_DB, COMPUTED_TYPES,
    cleanProp, cleanView, cleanValue, convertValue, newId, DbError,
} from "./dbTypes"

const MAX_DEPTH = 8
const IMPORT_BATCH = 200

// ---- access ----

type Actor = { userId: Id<"users">; member: Doc<"members"> }

const actorFor = async (ctx: QueryCtx | MutationCtx, workspaceId: Id<"workspaces">): Promise<Actor> => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new ConvexError("Please sign in")
    const member = await ctx.db
        .query("members")
        .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
        .unique()
    if (!member || member.role === "guest") throw new ConvexError("You don't have access to databases in this workspace")
    await assert2fa(ctx, member)
    return { userId, member }
}

const openDatabase = async (ctx: QueryCtx | MutationCtx, docId: Id<"docs">) => {
    const doc = await ctx.db.get(docId)
    if (!doc || doc.type !== "database" || doc.deletedAt) throw new ConvexError("Database not found")
    const actor = await actorFor(ctx, doc.workspaceId)
    const config = await ctx.db.query("dbConfigs").withIndex("by_doc_id", (q) => q.eq("docId", docId)).unique()
    if (!config) throw new ConvexError("Database not found")
    return { doc, config, ...actor }
}

// changing properties and views is a bigger step than editing rows
const requireSchema = async (ctx: MutationCtx, docId: Id<"docs">) => {
    const r = await openDatabase(ctx, docId)
    if (!(await can(ctx, r.member, "createDocs"))) throw new ConvexError("You don't have permission to change this database")
    return r
}

const openRow = async (ctx: QueryCtx | MutationCtx, rowId: Id<"dbRows">) => {
    const row = await ctx.db.get(rowId)
    if (!row) throw new ConvexError("Row not found")
    const actor = await actorFor(ctx, row.workspaceId)
    return { row, ...actor }
}

// Turns validation failures from the shared cleaners into friendly errors.
const guard = <T>(fn: () => T): T => {
    try { return fn() } catch (e) {
        if (e instanceof DbError) throw new ConvexError(e.message)
        throw e
    }
}

// ---- counts (rows per database and per workspace) ----

const countKey = { db: (id: string) => `db:${id}`, ws: (id: string) => `ws:${id}` }

const readCount = async (ctx: QueryCtx | MutationCtx, key: string) =>
    (await ctx.db.query("dbCounts").withIndex("by_key", (q) => q.eq("key", key)).unique())?.count ?? 0

const adjustCount = async (ctx: MutationCtx, key: string, workspaceId: Id<"workspaces">, delta: number) => {
    if (delta === 0) return
    const row = await ctx.db.query("dbCounts").withIndex("by_key", (q) => q.eq("key", key)).unique()
    if (row) await ctx.db.patch(row._id, { count: Math.max(0, row.count + delta) })
    else if (delta > 0) await ctx.db.insert("dbCounts", { key, workspaceId, count: delta })
}

const assertRoomForRows = async (ctx: MutationCtx, workspaceId: Id<"workspaces">, docId: Id<"docs">, adding: number) => {
    const ws = await ctx.db.get(workspaceId)
    const plan = getPlan(ws?.plan)
    const limit = PLANS[plan].dbRows
    if (limit !== -1 && (await readCount(ctx, countKey.ws(workspaceId))) + adding > limit) {
        throw new ConvexError(`LIMIT_REACHED:dbRows:${limit}:${plan}`)
    }
    if ((await readCount(ctx, countKey.db(docId))) + adding > MAX_ROWS_PER_DB) {
        throw new ConvexError(`A database can hold up to ${MAX_ROWS_PER_DB.toLocaleString()} rows. Split this one or archive old rows.`)
    }
}

const addRowsCount = async (ctx: MutationCtx, workspaceId: Id<"workspaces">, docId: Id<"docs">, delta: number) => {
    await adjustCount(ctx, countKey.db(docId), workspaceId, delta)
    await adjustCount(ctx, countKey.ws(workspaceId), workspaceId, delta)
}

// ---- values ----

// Cleans a map of cell values against a database's properties; people and related rows are checked for real.
const cleanValues = async (ctx: MutationCtx, props: Prop[], workspaceId: Id<"workspaces">, raw: unknown) => {
    const out: Record<string, unknown> = {}
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
    for (const [propId, rv] of Object.entries(raw as Record<string, unknown>)) {
        const prop = props.find((p) => p.id === propId)
        if (!prop || COMPUTED_TYPES.includes(prop.type)) continue
        let cv = cleanValue(prop, rv)
        if (cv === undefined) continue
        if (prop.type === "person") {
            const ids: string[] = []
            for (const id of cv as string[]) {
                const mid = ctx.db.normalizeId("members", id)
                const m = mid ? await ctx.db.get(mid) : null
                if (m && m.workspaceId === workspaceId) ids.push(m._id)
            }
            cv = ids.length ? ids : undefined
        } else if (prop.type === "relation") {
            const ids: string[] = []
            for (const id of cv as string[]) {
                const rid = ctx.db.normalizeId("dbRows", id)
                const r = rid ? await ctx.db.get(rid) : null
                if (r && r.workspaceId === workspaceId && r.databaseId === prop.relation?.databaseId) ids.push(r._id)
            }
            cv = ids.length ? ids : undefined
        }
        if (cv !== undefined) out[propId] = cv
    }
    return out
}

const cleanTitle = (raw: unknown) => (typeof raw === "string" ? raw.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500) : "")

const asProps = (c: Doc<"dbConfigs">) => c.properties as Prop[]
const asViews = (c: Doc<"dbConfigs">) => c.views as View[]

// Drops references to properties that no longer exist (or that a view can't use).
const tidyView = (view: View, props: Prop[]): View => {
    const ids = new Set(props.map((p) => p.id))
    ids.add("title")
    return {
        ...view,
        filter: { ...view.filter, conditions: view.filter.conditions.filter((c) => ids.has(c.propId)) },
        sorts: view.sorts.filter((s) => ids.has(s.propId)),
        hidden: view.hidden.filter((id) => ids.has(id)),
        order: view.order.filter((id) => ids.has(id)),
        groupBy: view.groupBy && ids.has(view.groupBy) ? view.groupBy : undefined,
        dateProp: view.dateProp && props.some((p) => p.id === view.dateProp && p.type === "date") ? view.dateProp : undefined,
    }
}

const defaultTableView = (): View => ({ id: newId(), name: "Table", type: "table", filter: { match: "and", conditions: [] }, sorts: [], hidden: [], order: [], widths: {} })

// Relation and rollup settings must point at real things.
const checkLinks = async (ctx: MutationCtx, prop: Prop, props: Prop[], workspaceId: Id<"workspaces">) => {
    if (prop.type === "relation") {
        const did = ctx.db.normalizeId("docs", prop.relation!.databaseId)
        const target = did ? await ctx.db.get(did) : null
        if (!target || target.type !== "database" || target.workspaceId !== workspaceId) throw new ConvexError("That database isn't available")
        prop.relation!.databaseId = target._id
    }
    if (prop.type === "rollup") {
        const rel = props.find((p) => p.id === prop.rollup!.relationId && p.type === "relation")
        if (!rel) throw new ConvexError("Choose a relation to roll up through")
        const tid = ctx.db.normalizeId("docs", rel.relation!.databaseId)
        const tcfg = tid ? await ctx.db.query("dbConfigs").withIndex("by_doc_id", (q) => q.eq("docId", tid)).unique() : null
        const ok = prop.rollup!.targetId === "title" || (tcfg && asProps(tcfg).some((p) => p.id === prop.rollup!.targetId))
        if (!ok) throw new ConvexError("Choose a property of the related database")
    }
}

// ---- reading ----

export const config = query({
    args: { docId: v.id("docs") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const doc = await ctx.db.get(args.docId)
        if (!doc || doc.type !== "database" || doc.deletedAt) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", doc.workspaceId).eq("userId", userId))
            .unique()
        if (!member || member.role === "guest") return null
        await assert2fa(ctx, member)
        const cfg = await ctx.db.query("dbConfigs").withIndex("by_doc_id", (q) => q.eq("docId", args.docId)).unique()
        if (!cfg) return null
        return {
            docId: doc._id, workspaceId: doc.workspaceId, title: doc.title, icon: doc.icon ?? null,
            properties: asProps(cfg), views: asViews(cfg),
            canEditSchema: await can(ctx, member, "createDocs"),
        }
    },
})

export const rows = query({
    args: { docId: v.id("docs") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        const doc = await ctx.db.get(args.docId)
        if (!doc || doc.type !== "database" || doc.deletedAt) return []
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", doc.workspaceId).eq("userId", userId))
            .unique()
        if (!member || member.role === "guest") return []
        await assert2fa(ctx, member)
        const list = await ctx.db.query("dbRows").withIndex("by_database_id", (q) => q.eq("databaseId", args.docId)).take(MAX_ROWS_PER_DB)
        return list
            .map((r) => ({
                _id: r._id, title: r.title, values: (r.values ?? {}) as Record<string, unknown>, position: r.position,
                createdAt: r._creationTime, createdBy: r.createdBy, updatedAt: r.updatedAt, updatedBy: r.updatedBy ?? null,
                roomId: r.roomId, hasBody: !!r.hasBody,
            }))
            .sort((a, b) => a.position - b.position)
    },
})

// Databases in this workspace, for the relation picker.
export const list = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        try { await actorFor(ctx, args.workspaceId) } catch { return [] }
        const docs = await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(1000)
        return docs.filter((d) => d.type === "database" && !d.deletedAt).map((d) => ({ _id: d._id, title: d.title, icon: d.icon ?? null }))
    },
})

// Properties of another database (for choosing what to roll up).
export const propertiesOf = query({
    args: { docId: v.id("docs") },
    handler: async (ctx, args) => {
        try {
            const { config } = await openDatabase(ctx, args.docId)
            return asProps(config).map((p) => ({ id: p.id, name: p.name, type: p.type }))
        } catch { return [] }
    },
})

// ---- creating ----

const rowSpec = v.object({ title: v.string(), values: v.optional(v.any()) })

export const create = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        parentId: v.optional(v.id("docs")),
        title: v.string(),
        icon: v.optional(v.string()),
        properties: v.optional(v.array(v.any())),
        views: v.optional(v.array(v.any())),
        rows: v.optional(v.array(rowSpec)),
    },
    handler: async (ctx, args) => {
        const { userId, member } = await actorFor(ctx, args.workspaceId)
        if (!(await can(ctx, member, "createDocs"))) throw new ConvexError("You don't have permission to create databases")
        await throttle(ctx, userId, "doc-create", 20, 60 * 60_000, "creating pages")
        const lim = await checkLimitLazy(ctx, args.workspaceId, "docs", (cap) => countLiveDocs(ctx, args.workspaceId, cap))
        if (!lim.allowed) throw new ConvexError(`LIMIT_REACHED:docs:${lim.limit}:${lim.plan}`)

        const title = cleanTitle(args.title)
        if (!title) throw new ConvexError("Title is required")

        if (args.parentId) {
            const parent = await ctx.db.get(args.parentId)
            if (!parent || parent.deletedAt || parent.workspaceId !== args.workspaceId) throw new ConvexError("Parent page not found")
            let depth = 0
            let cur: Id<"docs"> | undefined = args.parentId
            while (cur && depth <= MAX_DEPTH) { const d: Doc<"docs"> | null = await ctx.db.get(cur); depth++; cur = d?.parentId }
            if (depth >= MAX_DEPTH) throw new ConvexError(`Pages can be nested up to ${MAX_DEPTH} levels deep`)
        }

        const props: Prop[] = guard(() => {
            const raw = args.properties?.length ? args.properties.slice(0, MAX_PROPS) : [{ id: "tags", name: "Tags", type: "multiSelect", options: [] }]
            const list = raw.map(cleanProp)
            const seen = new Set<string>()
            return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
        })
        // templates may only point relations at databases that already exist
        for (const p of props) if (p.type === "relation" || p.type === "rollup") await checkLinks(ctx, p, props, args.workspaceId)
        const views: View[] = guard(() => {
            const list = (args.views?.length ? args.views.slice(0, MAX_VIEWS) : [defaultTableView()]).map(cleanView)
            const seen = new Set<string>()
            return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).map((x) => tidyView(x, props))
        })

        const specRows = (args.rows ?? []).slice(0, IMPORT_BATCH)
        if (specRows.length) {
            const ws = await ctx.db.get(args.workspaceId)
            const limit = PLANS[getPlan(ws?.plan)].dbRows
            if (limit !== -1 && (await readCount(ctx, countKey.ws(args.workspaceId))) + specRows.length > limit) {
                throw new ConvexError(`LIMIT_REACHED:dbRows:${limit}:${getPlan(ws?.plan)}`)
            }
        }

        const now = Date.now()
        const docId = await ctx.db.insert("docs", {
            title, workspaceId: args.workspaceId, createdBy: member._id, type: "database",
            liveblocksRoomId: `${args.workspaceId}-db-${now}-${Math.random().toString(36).slice(2, 8)}`,
            updatedAt: now, parentId: args.parentId, position: now,
            icon: args.icon && args.icon.length <= 8 ? args.icon : undefined,
        })
        await ctx.db.insert("dbConfigs", { docId, workspaceId: args.workspaceId, properties: props, views })

        let i = 0
        for (const r of specRows) {
            const values = await cleanValues(ctx, props, args.workspaceId, r.values)
            await ctx.db.insert("dbRows", {
                databaseId: docId, workspaceId: args.workspaceId, title: cleanTitle(r.title), values,
                position: now + i++, createdBy: member._id, updatedAt: now,
                roomId: `${args.workspaceId}-row-${now}-${Math.random().toString(36).slice(2, 10)}`,
            })
        }
        await addRowsCount(ctx, args.workspaceId, docId, specRows.length)
        return docId
    },
})

export const duplicate = mutation({
    args: { docId: v.id("docs") },
    handler: async (ctx, args) => {
        const { doc, config: cfg, member } = await openDatabase(ctx, args.docId)
        if (!(await can(ctx, member, "createDocs"))) throw new ConvexError("You don't have permission to create databases")
        const lim = await checkLimitLazy(ctx, doc.workspaceId, "docs", (cap) => countLiveDocs(ctx, doc.workspaceId, cap))
        if (!lim.allowed) throw new ConvexError(`LIMIT_REACHED:docs:${lim.limit}:${lim.plan}`)
        const src = await ctx.db.query("dbRows").withIndex("by_database_id", (q) => q.eq("databaseId", args.docId)).take(MAX_ROWS_PER_DB)
        const ws = await ctx.db.get(doc.workspaceId)
        const limit = PLANS[getPlan(ws?.plan)].dbRows
        if (limit !== -1 && (await readCount(ctx, countKey.ws(doc.workspaceId))) + src.length > limit) {
            throw new ConvexError(`LIMIT_REACHED:dbRows:${limit}:${getPlan(ws?.plan)}`)
        }
        const now = Date.now()
        const copyId = await ctx.db.insert("docs", {
            title: `${doc.title} copy`.slice(0, 120), workspaceId: doc.workspaceId, createdBy: member._id, type: "database",
            liveblocksRoomId: `${doc.workspaceId}-db-${now}-${Math.random().toString(36).slice(2, 8)}`,
            updatedAt: now, parentId: doc.parentId, position: now, icon: doc.icon,
        })
        await ctx.db.insert("dbConfigs", { docId: copyId, workspaceId: doc.workspaceId, properties: cfg.properties, views: cfg.views })
        // relations between copied rows stay pointing at the originals, which is what you want for a copy
        for (const r of src) {
            await ctx.db.insert("dbRows", {
                databaseId: copyId, workspaceId: doc.workspaceId, title: r.title, values: r.values, position: r.position,
                createdBy: member._id, updatedAt: now, roomId: `${doc.workspaceId}-row-${now}-${Math.random().toString(36).slice(2, 10)}`,
            })
        }
        await addRowsCount(ctx, doc.workspaceId, copyId, src.length)
        return copyId
    },
})

// ---- properties ----

export const saveProperty = mutation({
    args: { docId: v.id("docs"), property: v.any() },
    handler: async (ctx, args) => {
        const { config: cfg, doc } = await requireSchema(ctx, args.docId)
        const props = asProps(cfg)
        const next = guard(() => cleanProp(args.property))
        const idx = props.findIndex((p) => p.id === next.id)
        if (props.some((p) => p.id !== next.id && p.name.toLowerCase() === next.name.toLowerCase()) || next.name.toLowerCase() === "name") {
            throw new ConvexError("A property with that name already exists")
        }
        if (idx === -1 && props.length >= MAX_PROPS) throw new ConvexError(`A database can have up to ${MAX_PROPS} properties`)
        const merged = idx === -1 ? [...props, next] : props.map((p, i) => (i === idx ? next : p))
        await checkLinks(ctx, next, merged, doc.workspaceId)

        if (idx !== -1) {
            const old = props[idx]
            const typeChanged = old.type !== next.type
            const removedOpts = (old.options ?? []).filter((o) => !(next.options ?? []).some((n) => n.id === o.id)).map((o) => o.id)
            const relChanged = old.type === "relation" && next.type === "relation" && old.relation?.databaseId !== next.relation?.databaseId
            const clearAll = COMPUTED_TYPES.includes(next.type) || relChanged
            if (typeChanged || removedOpts.length || clearAll || (next.type === "relation" && old.relation?.many && !next.relation?.many)) {
                const all = await ctx.db.query("dbRows").withIndex("by_database_id", (q) => q.eq("databaseId", args.docId)).take(MAX_ROWS_PER_DB)
                for (const r of all) {
                    const values = { ...((r.values ?? {}) as Record<string, unknown>) }
                    if (!(next.id in values)) continue
                    let nv: unknown
                    if (clearAll) nv = undefined
                    else if (typeChanged) nv = convertValue(old, next, values[next.id])
                    else nv = cleanValue(next, values[next.id])
                    if (nv === undefined) delete values[next.id]
                    else values[next.id] = nv
                    await ctx.db.patch(r._id, { values })
                }
            }
        }
        await ctx.db.patch(cfg._id, { properties: merged })
        return next.id
    },
})

export const deleteProperty = mutation({
    args: { docId: v.id("docs"), propId: v.string() },
    handler: async (ctx, args) => {
        const { config: cfg } = await requireSchema(ctx, args.docId)
        const props = asProps(cfg).filter((p) => p.id !== args.propId)
        if (props.length === asProps(cfg).length) return args.propId
        const rowsAll = await ctx.db.query("dbRows").withIndex("by_database_id", (q) => q.eq("databaseId", args.docId)).take(MAX_ROWS_PER_DB)
        for (const r of rowsAll) {
            const values = (r.values ?? {}) as Record<string, unknown>
            if (args.propId in values) {
                const copy = { ...values }
                delete copy[args.propId]
                await ctx.db.patch(r._id, { values: copy })
            }
        }
        await ctx.db.patch(cfg._id, { properties: props, views: asViews(cfg).map((x) => tidyView(x, props)) })
        return args.propId
    },
})

// ---- views ----

export const saveView = mutation({
    args: { docId: v.id("docs"), view: v.any() },
    handler: async (ctx, args) => {
        const { config: cfg, member } = await openDatabase(ctx, args.docId)
        // changing how you look at a database is open to everyone who can edit rows' pages
        void member
        const props = asProps(cfg)
        const view = tidyView(guard(() => cleanView(args.view)), props)
        const views = asViews(cfg)
        const idx = views.findIndex((x) => x.id === view.id)
        if (idx === -1 && views.length >= MAX_VIEWS) throw new ConvexError(`A database can have up to ${MAX_VIEWS} views`)
        await ctx.db.patch(cfg._id, { views: idx === -1 ? [...views, view] : views.map((x, i) => (i === idx ? view : x)) })
        return view.id
    },
})

export const deleteView = mutation({
    args: { docId: v.id("docs"), viewId: v.string() },
    handler: async (ctx, args) => {
        const { config: cfg } = await openDatabase(ctx, args.docId)
        const views = asViews(cfg)
        if (views.length <= 1) throw new ConvexError("A database needs at least one view")
        await ctx.db.patch(cfg._id, { views: views.filter((x) => x.id !== args.viewId) })
        return args.viewId
    },
})

// ---- rows ----

export const addRow = mutation({
    args: { docId: v.id("docs"), title: v.optional(v.string()), values: v.optional(v.any()), position: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const { doc, config: cfg, userId, member } = await openDatabase(ctx, args.docId)
        await throttle(ctx, userId, "db-row", 300, 60_000, "adding rows")
        await assertRoomForRows(ctx, doc.workspaceId, doc._id, 1)
        const now = Date.now()
        const values = await cleanValues(ctx, asProps(cfg), doc.workspaceId, args.values)
        const id = await ctx.db.insert("dbRows", {
            databaseId: doc._id, workspaceId: doc.workspaceId, title: cleanTitle(args.title), values,
            position: args.position ?? now, createdBy: member._id, updatedAt: now,
            roomId: `${doc.workspaceId}-row-${now}-${Math.random().toString(36).slice(2, 10)}`,
        })
        await addRowsCount(ctx, doc.workspaceId, doc._id, 1)
        return id
    },
})

export const setTitle = mutation({
    args: { rowId: v.id("dbRows"), title: v.string() },
    handler: async (ctx, args) => {
        const { row, member } = await openRow(ctx, args.rowId)
        await ctx.db.patch(row._id, { title: cleanTitle(args.title), updatedAt: Date.now(), updatedBy: member._id })
        return row._id
    },
})

export const setCell = mutation({
    args: { rowId: v.id("dbRows"), propId: v.string(), value: v.any() },
    handler: async (ctx, args) => {
        const { row, member, userId } = await openRow(ctx, args.rowId)
        await throttle(ctx, userId, "db-cell", 600, 60_000, "editing rows")
        const cfg = await ctx.db.query("dbConfigs").withIndex("by_doc_id", (q) => q.eq("docId", row.databaseId)).unique()
        if (!cfg) throw new ConvexError("Database not found")
        const cleaned = await cleanValues(ctx, asProps(cfg), row.workspaceId, { [args.propId]: args.value })
        const values = { ...((row.values ?? {}) as Record<string, unknown>) }
        if (args.propId in cleaned) values[args.propId] = cleaned[args.propId]
        else delete values[args.propId]
        await ctx.db.patch(row._id, { values, updatedAt: Date.now(), updatedBy: member._id })
        return row._id
    },
})

// Moves a row in the manual order and, optionally, sets cells at the same time (dragging between board columns).
export const moveRow = mutation({
    args: { rowId: v.id("dbRows"), position: v.number(), values: v.optional(v.any()) },
    handler: async (ctx, args) => {
        const { row, member } = await openRow(ctx, args.rowId)
        if (!Number.isFinite(args.position)) throw new ConvexError("Invalid position")
        const patch: Partial<Doc<"dbRows">> = { position: args.position, updatedAt: Date.now(), updatedBy: member._id }
        if (args.values) {
            const cfg = await ctx.db.query("dbConfigs").withIndex("by_doc_id", (q) => q.eq("docId", row.databaseId)).unique()
            if (cfg) {
                const props = asProps(cfg)
                const cleaned = await cleanValues(ctx, props, row.workspaceId, args.values)
                const values = { ...((row.values ?? {}) as Record<string, unknown>) }
                for (const k of Object.keys(args.values as Record<string, unknown>)) {
                    if (k in cleaned) values[k] = cleaned[k]
                    else delete values[k]
                }
                patch.values = values
            }
        }
        await ctx.db.patch(row._id, patch)
        return row._id
    },
})

export const deleteRows = mutation({
    args: { docId: v.id("docs"), rowIds: v.array(v.id("dbRows")) },
    handler: async (ctx, args) => {
        const { doc } = await openDatabase(ctx, args.docId)
        let removed = 0
        for (const id of args.rowIds.slice(0, 500)) {
            const r = await ctx.db.get(id)
            if (!r || r.databaseId !== args.docId) continue
            await ctx.db.delete(id)
            if (r.hasBody) await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, { roomId: r.roomId })
            removed++
        }
        await addRowsCount(ctx, doc.workspaceId, doc._id, -removed)
        return removed
    },
})

export const duplicateRow = mutation({
    args: { rowId: v.id("dbRows") },
    handler: async (ctx, args) => {
        const { row, member } = await openRow(ctx, args.rowId)
        await assertRoomForRows(ctx, row.workspaceId, row.databaseId, 1)
        const now = Date.now()
        const id = await ctx.db.insert("dbRows", {
            databaseId: row.databaseId, workspaceId: row.workspaceId, title: row.title, values: row.values,
            position: row.position + 0.5, createdBy: member._id, updatedAt: now,
            roomId: `${row.workspaceId}-row-${now}-${Math.random().toString(36).slice(2, 10)}`,
        })
        await addRowsCount(ctx, row.workspaceId, row.databaseId, 1)
        return id
    },
})

// CSV import arrives in batches from the browser, already matched to properties.
export const importRows = mutation({
    args: { docId: v.id("docs"), rows: v.array(rowSpec) },
    handler: async (ctx, args) => {
        const { doc, config: cfg, userId, member } = await openDatabase(ctx, args.docId)
        const batch = args.rows.slice(0, IMPORT_BATCH)
        await throttle(ctx, userId, "db-import", 60, 60_000, "importing rows")
        await assertRoomForRows(ctx, doc.workspaceId, doc._id, batch.length)
        const props = asProps(cfg)
        const now = Date.now()
        let i = 0
        for (const r of batch) {
            await ctx.db.insert("dbRows", {
                databaseId: doc._id, workspaceId: doc.workspaceId, title: cleanTitle(r.title),
                values: await cleanValues(ctx, props, doc.workspaceId, r.values),
                position: now + i++ / 1000, createdBy: member._id, updatedAt: now,
                roomId: `${doc.workspaceId}-row-${now}-${Math.random().toString(36).slice(2, 10)}-${i}`,
            })
        }
        await addRowsCount(ctx, doc.workspaceId, doc._id, batch.length)
        return batch.length
    },
})

// Called (debounced) while someone writes in a row's page, so the row remembers it has a body to clean up later.
export const touchRow = mutation({
    args: { rowId: v.id("dbRows") },
    handler: async (ctx, args) => {
        const { row, member } = await openRow(ctx, args.rowId)
        if (row.hasBody && Date.now() - row.updatedAt < 5000) return null
        await ctx.db.patch(row._id, { hasBody: true, updatedAt: Date.now(), updatedBy: member._id })
        return row._id
    },
})

// ---- deleting a whole database (scheduled by docs.remove) ----

export const purgeDatabase = internalMutation({
    args: { docId: v.id("docs") },
    handler: async (ctx, args) => {
        const batch = await ctx.db.query("dbRows").withIndex("by_database_id", (q) => q.eq("databaseId", args.docId)).take(200)
        let workspaceId: Id<"workspaces"> | undefined
        for (const r of batch) {
            workspaceId = r.workspaceId
            if (r.hasBody) await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, { roomId: r.roomId })
            await ctx.db.delete(r._id)
        }
        if (workspaceId) await adjustCount(ctx, countKey.ws(workspaceId), workspaceId, -batch.length)
        if (batch.length === 200) {
            await ctx.scheduler.runAfter(0, internal.databases.purgeDatabase, args)
            return
        }
        const cfg = await ctx.db.query("dbConfigs").withIndex("by_doc_id", (q) => q.eq("docId", args.docId)).unique()
        if (cfg) await ctx.db.delete(cfg._id)
        const counter = await ctx.db.query("dbCounts").withIndex("by_key", (q) => q.eq("key", countKey.db(args.docId))).unique()
        if (counter) await ctx.db.delete(counter._id)
    },
})
