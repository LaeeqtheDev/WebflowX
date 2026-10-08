// Mirrors convex/limits.ts so the UI can describe plans without importing server code.
// Keep in sync with PLANS there (and the cards in more-modal.tsx).
export type PlanKey = "free" | "startup" | "growth" | "enterprise"

export type LimitFeature =
    | "workspaces" | "members" | "channels" | "personalNotes" | "workspaceNotes"
    | "docs" | "dbRows" | "meetings" | "aiSummaries" | "guests" | "apiKeys" | "incomingHooks" | "outgoingHooks" | "githubHooks" | "storage"

type PlanLimits = {
    name: string
    price: number
    workspaces: number
    members: number
    channels: number
    personalNotes: number
    workspaceNotes: number
    docs: number
    dbRows: number
    meetings: number
    aiSummaries: number
    guests: number
    apiKeys: number
    incomingHooks: number
    outgoingHooks: number
    githubHooks: number
    storageMb: number
}

export const PLAN_ORDER: PlanKey[] = ["free", "startup", "growth", "enterprise"]

// -1 means unlimited
export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
    free: { name: "Free", price: 0, workspaces: 1, members: 10, channels: 5, personalNotes: 10, workspaceNotes: 20, docs: 20, dbRows: 500, meetings: 5, aiSummaries: 2, guests: 0, apiKeys: 0, incomingHooks: 0, outgoingHooks: 0, githubHooks: 0, storageMb: 250 },
    startup: { name: "Startup", price: 29, workspaces: 3, members: 25, channels: 20, personalNotes: 50, workspaceNotes: 100, docs: 100, dbRows: 5_000, meetings: 20, aiSummaries: 10, guests: 5, apiKeys: 3, incomingHooks: 5, outgoingHooks: 0, githubHooks: 0, storageMb: 5_000 },
    growth: { name: "Growth", price: 79, workspaces: 10, members: 100, channels: 50, personalNotes: -1, workspaceNotes: -1, docs: 500, dbRows: 50_000, meetings: 50, aiSummaries: 30, guests: 25, apiKeys: 10, incomingHooks: 20, outgoingHooks: 10, githubHooks: 5, storageMb: 50_000 },
    enterprise: { name: "Enterprise", price: 249, workspaces: -1, members: -1, channels: -1, personalNotes: -1, workspaceNotes: -1, docs: -1, dbRows: -1, meetings: 200, aiSummaries: 150, guests: -1, apiKeys: -1, incomingHooks: -1, outgoingHooks: -1, githubHooks: -1, storageMb: 1_000_000 },
}

export type LimitInfo = {
    feature: LimitFeature | string
    limit: number
    plan: PlanKey | "unknown"
}

// noun: plural noun used in sentences; period: what the allowance resets over
export const FEATURE_META: Record<string, { noun: string; singular: string; period?: string }> = {
    workspaces: { noun: "workspaces", singular: "workspace" },
    members: { noun: "members", singular: "member" },
    channels: { noun: "channels", singular: "channel" },
    personalNotes: { noun: "personal notes", singular: "personal note" },
    workspaceNotes: { noun: "workspace notes", singular: "workspace note" },
    docs: { noun: "pages", singular: "page" },
    dbRows: { noun: "database rows", singular: "database row" },
    meetings: { noun: "meetings", singular: "meeting", period: "this month" },
    aiSummaries: { noun: "AI summaries", singular: "AI summary", period: "this month" },
    guests: { noun: "guests", singular: "guest" },
    apiKeys: { noun: "API keys", singular: "API key" },
    incomingHooks: { noun: "incoming webhooks", singular: "incoming webhook" },
    outgoingHooks: { noun: "outgoing webhooks", singular: "outgoing webhook" },
    githubHooks: { noun: "GitHub connections", singular: "GitHub connection" },
    storage: { noun: "storage", singular: "storage" },
}

const toPlan = (p?: string): PlanKey | "unknown" =>
    p === "free" || p === "startup" || p === "growth" || p === "enterprise" ? p : "unknown"

export const parseLimitError = (message: string): LimitInfo | null => {
    const at = message.indexOf("LIMIT_REACHED:")
    if (at === -1) return null
    const [, feature, limit, plan] = message.slice(at).split(":")
    if (!feature) return null
    const n = parseInt(limit ?? "", 10)
    return { feature, limit: Number.isFinite(n) ? n : 0, plan: toPlan(plan?.trim()) }
}

export const isStorageError = (message: string) => /out of storage/i.test(message)

export const nextPlanOf = (plan: PlanKey | "unknown"): PlanKey | null => {
    const i = PLAN_ORDER.indexOf(plan === "unknown" ? "free" : plan)
    return i >= 0 && i < PLAN_ORDER.length - 1 ? PLAN_ORDER[i + 1] : null
}

const featureValue = (plan: PlanKey, feature: string): number => {
    const p = PLAN_LIMITS[plan]
    if (feature === "storage") return p.storageMb
    return (p as unknown as Record<string, number>)[feature] ?? 0
}

export const formatStorage = (mb: number) => {
    if (mb >= 1_000_000) return `${mb / 1_000_000} TB`
    if (mb >= 1000) return `${mb / 1000} GB`
    return `${mb} MB`
}

// "5 channels", "1 workspace", "Unlimited notes", "250 MB storage"
export const formatAllowance = (feature: string, value: number) => {
    const meta = FEATURE_META[feature]
    if (feature === "storage") return `${formatStorage(value)} of storage`
    const noun = value === 1 ? meta?.singular : meta?.noun
    const period = meta?.period ? ` ${meta.period}` : ""
    if (value === -1) return `Unlimited ${meta?.noun ?? feature}${period}`
    return `${value} ${noun ?? feature}${period}`
}

export const limitFor = (plan: PlanKey, feature: string) => featureValue(plan, feature)
