import { describe, expect, it } from "vitest"
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  canAccessChannel,
  hasPermission,
  isAdminLike,
  permissionList,
  roleOf,
} from "../convex/permissions"

// Minimal stand-ins for database documents; the functions under test only read these fields.
const ws = (over: Record<string, unknown> = {}) => ({ _id: "w1", userId: "owner", ...over }) as never
const member = (over: Record<string, unknown> = {}) => ({ _id: "m1", userId: "u1", role: "member", ...over }) as never
const channel = (over: Record<string, unknown> = {}) => ({ _id: "c1", isPrivate: false, ...over }) as never

describe("permissionList", () => {
  it("gives the owner and admins everything", () => {
    expect(permissionList(ws(), member({ userId: "owner", role: "admin" }))).toEqual([...PERMISSIONS])
    expect(permissionList(ws(), member({ role: "admin" }))).toEqual([...PERMISSIONS])
  })

  it("limits guests to file uploads", () => {
    expect(permissionList(ws(), member({ role: "guest" }))).toEqual(["uploadFiles"])
  })

  it("does not let plain members start workspace meetings by default", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.member).not.toContain("startMeetings")
    expect(hasPermission(ws(), member(), "startMeetings")).toBe(false)
  })

  it("lets moderators start meetings and delete messages by default", () => {
    const m = member({ role: "moderator" })
    expect(hasPermission(ws(), m, "startMeetings")).toBe(true)
    expect(hasPermission(ws(), m, "deleteMessages")).toBe(true)
    expect(hasPermission(ws(), m, "manageMembers")).toBe(false)
  })

  it("uses a custom role when one is assigned and ignores unknown permissions", () => {
    const w = ws({ customRoles: [{ id: "r1", name: "Host", permissions: ["startMeetings", "notARealPermission"] }] })
    expect(permissionList(w, member({ customRoleId: "r1" }))).toEqual(["startMeetings"])
  })

  it("uses configured role permissions and keeps legacy defaults until permsVersion is 2", () => {
    const legacy = ws({ rolePermissions: { member: ["createChannels"] } })
    expect(permissionList(legacy, member())).toEqual(expect.arrayContaining(["createChannels", "uploadFiles", "createDocs"]))
    const v2 = ws({ rolePermissions: { member: ["createChannels"] }, permsVersion: 2 })
    expect(permissionList(v2, member())).toEqual(["createChannels"])
  })
})

describe("roles", () => {
  it("reports the owner as owner whatever the stored role", () => {
    expect(roleOf(ws(), member({ userId: "owner", role: "admin" }))).toBe("owner")
    expect(roleOf(ws(), member({ role: "moderator" }))).toBe("moderator")
  })
  it("treats only owner and admin as admin-like", () => {
    expect(isAdminLike(ws(), member({ role: "admin" }))).toBe(true)
    expect(isAdminLike(ws(), member({ userId: "owner" }))).toBe(true)
    expect(isAdminLike(ws(), member({ role: "moderator" }))).toBe(false)
  })
})

describe("canAccessChannel", () => {
  it("opens public channels to members", () => {
    expect(canAccessChannel(ws(), member(), channel())).toBe(true)
  })
  it("hides locked channels unless added or allowed to view them", () => {
    const locked = channel({ isPrivate: true, memberIds: [] })
    expect(canAccessChannel(ws(), member(), locked)).toBe(false)
    expect(canAccessChannel(ws(), member(), channel({ isPrivate: true, memberIds: ["m1"] }))).toBe(true)
    expect(canAccessChannel(ws(), member({ role: "moderator" }), locked)).toBe(true)
  })
  it("gives guests only the channels they were added to, even public ones", () => {
    const g = member({ role: "guest" })
    expect(canAccessChannel(ws(), g, channel())).toBe(false)
    expect(canAccessChannel(ws(), g, channel({ guestIds: ["m1"] }))).toBe(true)
  })
})
