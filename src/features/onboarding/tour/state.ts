export const TOUR_STEPS = 10

export type Priority = "urgent" | "high" | "medium" | "low"
export type TaskStage = "todo" | "progress" | "done"

export type TourState = {
  step: number
  msg1?: string
  msg2?: string
  reacted?: string
  replies: string[]
  task?: { title: string; priority: Priority; stage: TaskStage }
  page?: { title: string; body: string }
  meeting: "idle" | "live" | "ended"
  searched?: boolean
  /** left the tour before the end; it can be resumed from the wizard */
  skipped?: boolean
  finished?: boolean
}

export const freshTour = (): TourState => ({ step: 1, replies: [], meeting: "idle" })

const key = (workspaceId: string) => `wfx:tour:${workspaceId}`

export function loadTour(workspaceId: string): TourState | null {
  try {
    const raw = window.localStorage.getItem(key(workspaceId))
    if (!raw) return null
    const s = JSON.parse(raw) as TourState
    if (!s || typeof s.step !== "number" || s.step < 1 || s.step > TOUR_STEPS) return null
    return { ...freshTour(), ...s, replies: Array.isArray(s.replies) ? s.replies : [] }
  } catch { return null }
}

export function saveTour(workspaceId: string, s: TourState) {
  try { window.localStorage.setItem(key(workspaceId), JSON.stringify(s)) } catch { /* private mode */ }
}

/** True when the practice workspace holds anything worth asking about. */
export const createdItems = (s: TourState) => ({
  msg1: !!s.msg1,
  msg2: !!s.msg2,
  task: !!s.task,
  page: !!s.page,
  meeting: s.meeting === "ended",
})

export const hasCreated = (s: TourState) => Object.values(createdItems(s)).some(Boolean)

/** Whether the current step's practice action is done, so Next can be offered as the main button. */
export function stepDone(s: TourState): boolean {
  switch (s.step) {
    case 1: return !!s.msg1
    case 2: return !!s.msg2
    case 3: return !!s.reacted
    case 4: return !!s.task
    case 5: return s.task?.stage === "done"
    case 6: return !!s.page
    case 7: return s.meeting === "ended"
    case 8: return !!s.searched
    default: return true
  }
}

export const quillBody = (text: string) => JSON.stringify({ ops: [{ insert: `${text.trim()}\n` }] })

export const STAGE_TO_STATUS: Record<TaskStage, "todo" | "in_progress" | "done"> = { todo: "todo", progress: "in_progress", done: "done" }
