// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, renderHook, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createElement } from "react"
import { Toolbar2 } from "../src/app/dashboard/workspace/[workspaceId]/components/Toolbar2"
import { useMountOnce } from "../src/hooks/use-mount-once"

afterEach(cleanup)

const props = { isAuthor: true, isPending: false, handleEdit() {}, handleThread() {}, handleDelete() {}, handleReaction() {} }

describe("useMountOnce", () => {
  it("stays true once it has been true, so a closing dialog can finish animating", () => {
    const { result, rerender } = renderHook(({ open }) => useMountOnce(open), { initialProps: { open: false } })
    expect(result.current).toBe(false)
    rerender({ open: true })
    expect(result.current).toBe(true)
    rerender({ open: false })
    expect(result.current).toBe(true)
  })
  it("is true straight away when it starts open", () => {
    expect(renderHook(() => useMountOnce(true)).result.current).toBe(true)
  })
})

describe("message action bar", () => {
  it("is not built until the message is pointed at", () => {
    const { rerender } = render(createElement(Toolbar2, { ...props, live: false }))
    expect(screen.queryByRole("button", { name: "Add reaction" })).toBeNull()
    rerender(createElement(Toolbar2, { ...props, live: true }))
    expect(screen.getByRole("button", { name: "Add reaction" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete message" })).toBeTruthy()
  })
  it("builds the phone action sheet only after the … button is tapped", async () => {
    const u = userEvent.setup()
    render(createElement(Toolbar2, { ...props, live: false }))
    expect(screen.queryByText("Message actions", { selector: "h2" })).toBeNull()
    await act(async () => { await u.click(screen.getByRole("button", { name: "Message actions" })) })
    expect(await screen.findByText("Delete message")).toBeTruthy()
  })
})
