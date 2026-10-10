// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { setDataSaverPref, useLowData, useLowDataSync } from "../src/hooks/use-low-data"
import { Thumbnail } from "../src/app/dashboard/workspace/[workspaceId]/components/thumbnail"
import { Avatar, AvatarFallback, AvatarImage } from "../src/components/ui/avatar"

const Probe = () => { useLowDataSync(); return <p>{useLowData() ? "low" : "normal"}</p> }

describe("data saver", () => {
  afterEach(() => { cleanup(); act(() => setDataSaverPref("auto")); localStorage.clear() })

  it("follows the person's choice and marks the page", () => {
    render(<Probe />)
    expect(screen.getByText("normal")).toBeTruthy()
    act(() => setDataSaverPref("on"))
    expect(screen.getByText("low")).toBeTruthy()
    expect(document.documentElement.dataset.lowdata).toBe("1")
    act(() => setDataSaverPref("off"))
    expect(document.documentElement.dataset.lowdata).toBe("0")
    expect(localStorage.getItem("wfx-datasaver")).toBe("off")
  })

  it("holds message images back until asked for", async () => {
    render(<><Probe /><Thumbnail url="https://img.test/a.png" /></>)
    expect(document.querySelector("img")).not.toBeNull()
    act(() => setDataSaverPref("on"))
    expect(document.querySelector("img")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: /load image/i }))
    expect(document.querySelector("img")).not.toBeNull()
  })

  it("falls back to initials instead of downloading profile photos", () => {
    render(<><Probe /><Avatar><AvatarImage src="https://img.test/p.png" /><AvatarFallback>SA</AvatarFallback></Avatar></>)
    act(() => setDataSaverPref("on"))
    expect(screen.getByText("SA")).toBeTruthy()
    expect(document.querySelector('[data-slot="avatar-image"]')).toBeNull()
  })
})
