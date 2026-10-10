// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createElement } from "react"

const sendMessage = vi.fn().mockResolvedValue("m")
const createTask = vi.fn().mockResolvedValue("t")
const createNote = vi.fn().mockResolvedValue("n")
vi.mock("convex/react", () => ({
  useQuery: () => [{ _id: "general-id", name: "general" }],
  useMutation: (ref: { name: string }) => ({ messages: sendMessage, tasks: createTask, notes: createNote }[ref.name as "messages"]),
}))
vi.mock("../convex/_generated/api", () => ({
  api: { channels: { get: { name: "channels" } }, messages: { create: { name: "messages" } }, tasks: { create: { name: "tasks" } }, notes: { create: { name: "notes" } } },
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { OnboardingTour } from "../src/features/onboarding/tour/tour"
import { freshTour, loadTour, stepDone } from "../src/features/onboarding/tour/state"

afterEach(() => { cleanup(); window.localStorage.clear(); vi.clearAllMocks() })

const mount = (over: Partial<ReturnType<typeof freshTour>> = {}) => {
  const onSkip = vi.fn(), onFinish = vi.fn()
  render(createElement(OnboardingTour, { workspaceId: "ws1" as never, workspaceName: "Acme", channels: ["engineering"], initial: { ...freshTour(), ...over }, onSkip, onFinish }))
  return { onSkip, onFinish }
}
const next = (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getByRole("button", { name: "Next" }))

describe("tour state", () => {
  it("marks each practice step done only after the action", () => {
    expect(stepDone({ ...freshTour(), step: 1 })).toBe(false)
    expect(stepDone({ ...freshTour(), step: 1, msg1: "hi" })).toBe(true)
    expect(stepDone({ ...freshTour(), step: 5, task: { title: "x", priority: "low", stage: "progress" } })).toBe(false)
    expect(stepDone({ ...freshTour(), step: 5, task: { title: "x", priority: "low", stage: "done" } })).toBe(true)
  })
})

describe("OnboardingTour", () => {
  it("walks the whole practice flow and keeps selected items", async () => {
    const u = userEvent.setup()
    const { onFinish } = mount()
    // 1 chat
    await u.type(screen.getByLabelText("Message #general"), "Hello team")
    await u.click(screen.getByRole("button", { name: "Send" }))
    await next(u)
    // 2 slash menu -> AI
    const box = screen.getByLabelText("Message #general") as HTMLInputElement
    expect(box.value).toContain("standup")
    await u.type(box, " /")
    await u.click(await screen.findByRole("menuitem", { name: /Improve Writing/ }))
    expect(box.value).toContain("Tomorrow's standup")
    await u.click(screen.getByRole("button", { name: "Send" }))
    await next(u)
    // 3 reaction
    await u.click(screen.getByRole("button", { name: "👍" }))
    await next(u)
    // 4 message -> task
    await u.click(screen.getByRole("button", { name: "Create task" }))
    await u.click(within4())
    await next(u)
    // 5 board
    await u.click(screen.getByRole("button", { name: /Move to In progress/ }))
    await u.click(screen.getByRole("button", { name: /Move to Done/ }))
    await next(u)
    // 6 page
    await u.type(screen.getByLabelText(/Page title/), "Handbook")
    await u.type(screen.getByLabelText(/Write something/), "Welcome")
    await u.click(screen.getByRole("button", { name: "Save page" }))
    await next(u)
    // 7 meeting
    await u.click(screen.getByRole("button", { name: "Start meeting" }))
    await u.click(screen.getByRole("button", { name: "End and summarize" }))
    expect(screen.getByText("AI summary")).toBeTruthy()
    await next(u)
    // 8 search
    await u.type(screen.getByLabelText("Search messages, tasks and pages"), "standup")
    expect(await screen.findAllByText(/Tomorrow's standup/)).toBeTruthy()
    await next(u)
    // 9 more
    expect(screen.getByText("Databases")).toBeTruthy()
    await next(u)
    // 10 keep
    expect(screen.getByText("Keep what you made?")).toBeTruthy()
    await u.click(screen.getByRole("button", { name: "Keep selected" }))
    await waitFor(() => expect(onFinish).toHaveBeenCalled())
    expect(sendMessage).toHaveBeenCalledTimes(2)
    expect(sendMessage.mock.calls[0][0]).toMatchObject({ workspaceId: "ws1", channelId: "general-id" })
    expect(JSON.parse(sendMessage.mock.calls[0][0].body).ops[0].insert).toBe("Hello team\n")
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ status: "done", priority: "medium" }))
    expect(createNote).toHaveBeenCalledTimes(2) // page + meeting summary
    expect(loadTour("ws1")?.finished).toBe(true)
  })

  it("start fresh saves nothing", async () => {
    const u = userEvent.setup()
    const { onFinish } = mount({ step: 10, msg1: "hi", task: { title: "T", priority: "low", stage: "todo" } })
    await u.click(screen.getByRole("button", { name: "Start fresh" }))
    expect(onFinish).toHaveBeenCalled()
    expect(sendMessage).not.toHaveBeenCalled()
    expect(createTask).not.toHaveBeenCalled()
    expect(createNote).not.toHaveBeenCalled()
  })

  it("skip keeps progress for resuming and saves nothing", async () => {
    const u = userEvent.setup()
    const { onSkip } = mount({ step: 3, msg1: "hi" })
    await u.click(screen.getByRole("button", { name: "Skip tour" }))
    expect(onSkip).toHaveBeenCalled()
    expect(loadTour("ws1")).toMatchObject({ step: 3, skipped: true, msg1: "hi" })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it("shows nothing to keep when nothing was made", () => {
    mount({ step: 10 })
    expect(screen.getByText(/nothing to keep/)).toBeTruthy()
  })

  it("renders in another language", () => {
    window.localStorage.setItem("wfx:lang", "es")
    mount({ step: 9 })
    expect(screen.getByText("Y todo lo demás")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Idioma"), { target: { value: "en" } })
    expect(screen.getByText("And the rest")).toBeTruthy()
  })
})

function within4() {
  // the modal's create button (the page-level one is disabled once the dialog is open)
  const dialog = screen.getByRole("dialog", { name: "New task from message" })
  return dialog.querySelector("button.cursor-pointer.rounded-xl") as HTMLElement
}
