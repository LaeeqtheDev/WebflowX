import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
    ...authTables,
    // authTables.users plus profile fields
    users: defineTable({
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.number()),
        phone: v.optional(v.string()),
        phoneVerificationTime: v.optional(v.number()),
        isAnonymous: v.optional(v.boolean()),
        title: v.optional(v.string()),
        bio: v.optional(v.string()),
        // false turns off notification emails (mentions, DMs, replies, tasks). Default is on.
        emailNotifications: v.optional(v.boolean()),
        // each member's own appearance setting
        theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    })
        .index("email", ["email"])
        .index("phone", ["phone"]),

    // every uploaded file we accept, so storage can be counted per workspace and checked
    files: defineTable({
        workspaceId: v.optional(v.id("workspaces")),
        storageId: v.id("_storage"),
        uploadedBy: v.id("users"),
        kind: v.union(v.literal("image"), v.literal("file"), v.literal("doc"), v.literal("avatar")),
        size: v.number(),
        contentType: v.string(),
        // set once a message uses it; unattached uploads are cleaned up by a cron
        attached: v.optional(v.boolean()),
    })
        .index("by_storage_id", ["storageId"])
        .index("by_workspace_id", ["workspaceId"])
        .index("by_attached_creation", ["attached"]),

    auditLog: defineTable({
        workspaceId: v.id("workspaces"),
        actorId: v.id("members"),
        action: v.string(),
        detail: v.optional(v.string()),
    }).index("by_workspace_id", ["workspaceId"]),
    workspaces: defineTable({
        name: v.string(),
        userId: v.id("users"),
        joinCode: v.string(),
        plan: v.optional(
            v.union(
                v.literal("free"),
                v.literal("startup"),
                v.literal("growth"),
                v.literal("enterprise")
            )
        ),
        // invite controls
        joinCodeExpiresAt: v.optional(v.number()),
        invitesDisabled: v.optional(v.boolean()),
        // workspace profile
        image: v.optional(v.id("_storage")),
        description: v.optional(v.string()),
        // bytes of uploaded files currently stored for this workspace (plan-capped)
        storageBytes: v.optional(v.number()),
        // custom roles the owner/admins define on top of moderator and member
        customRoles: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    name: v.string(),
                    baseRole: v.union(v.literal("moderator"), v.literal("member")),
                    permissions: v.array(v.string()),
                })
            )
        ),
        // 2 once the owner has saved role permissions with the newer permission list
        permsVersion: v.optional(v.number()),
        // what moderators / members are allowed to do (admins and the owner can always do everything)
        rolePermissions: v.optional(
            v.object({
                moderator: v.array(v.string()),
                member: v.array(v.string()),
            })
        ),
    }).index("by_user_id", ["userId"]),

    members: defineTable({
        userId: v.id("users"),
        workspaceId: v.id("workspaces"),
        role: v.union(v.literal("admin"), v.literal("moderator"), v.literal("member")),
        // optional custom role (its permissions replace the base role's)
        customRoleId: v.optional(v.string()),
    })
        .index("byUserId", ["userId"])
        .index("byWorkspaceId", ["workspaceId"])
        .index("byWorkspaceId_user_id", ["workspaceId", "userId"]),

    channels: defineTable({
        name: v.string(),
        workspaceId: v.id("workspaces"),
        description: v.optional(v.string()),
        // locked channel: only people listed here and roles with "view private channels" can open it
        isPrivate: v.optional(v.boolean()),
        memberIds: v.optional(v.array(v.id("members"))),
        // announcement channel: everyone can read, only roles with "post in read-only channels" can write
        readOnly: v.optional(v.boolean()),
    }).index("byWorkspaceId", ["workspaceId"]),

    conversations: defineTable({
        workspaceId: v.id("workspaces"),
        memberOneId: v.id("members"),
        memberTwoId: v.id("members"),
    })
        .index("byWorkspaceId", ["workspaceId"])
        .index("by_member_one", ["memberOneId"])
        .index("by_member_two", ["memberTwoId"]),

    messages: defineTable({
        body: v.string(),
        image: v.optional(v.id("_storage")),
        // File attachment support
        file: v.optional(v.id("_storage")),
        fileName: v.optional(v.string()),
        fileType: v.optional(v.string()),
        fileSize: v.optional(v.number()),
        memberId: v.id("members"),
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        parentMessagesId: v.optional(v.id("messages")),
        conversationId: v.optional(v.id("conversations")),
        updatedAt: v.optional(v.number()),
    })
        .index("byWorkspaceId", ["workspaceId"])
        .index("by_member_id", ["memberId"])
        .index("by_channel_id", ["channelId"])
        .index("by_conversation_id", ["conversationId"])
        .index("by_channel_id_parent_message_id_conversation_id", [
            "channelId",
            "parentMessagesId",
            "conversationId",
        ])
        .index("by_parent_message_id", ["parentMessagesId"])
        .searchIndex("search_body", {
            searchField: "body",
            filterFields: ["workspaceId"],
        }),

    reactions: defineTable({
        workspaceId: v.id("workspaces"),
        messageId: v.id("messages"),
        memberId: v.id("members"),
        value: v.string(),
    })
        .index("byWorkspaceId", ["workspaceId"])
        .index("by_message_id", ["messageId"])
        .index("by_member_id", ["memberId"]),

    notes: defineTable({
        title: v.string(),
        body: v.string(),
        workspaceId: v.id("workspaces"),
        authorId: v.id("members"),
        type: v.union(v.literal("personal"), v.literal("workspace")),
        isPinned: v.optional(v.boolean()),
        updatedAt: v.optional(v.number()),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_author_id", ["authorId"])
        .index("by_author_id_type", ["authorId", "type"])
        .index("by_workspace_id_type", ["workspaceId", "type"])
        .searchIndex("search_title", {
            searchField: "title",
            filterFields: ["workspaceId", "type"],
        }),

    tasks: defineTable({
        title: v.string(),
        description: v.optional(v.string()),
        status: v.union(
            v.literal("backlog"),
            v.literal("todo"),
            v.literal("in_progress"),
            v.literal("in_review"),
            v.literal("done")
        ),
        priority: v.union(
            v.literal("urgent"),
            v.literal("high"),
            v.literal("medium"),
            v.literal("low")
        ),
        workspaceId: v.id("workspaces"),
        assigneeId: v.optional(v.id("members")),
        createdBy: v.id("members"),
        dueDate: v.optional(v.number()),
        labels: v.optional(v.array(v.string())),
        storyPoints: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
        sprintId: v.optional(v.id("sprints")),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_assignee_id", ["assigneeId"])
        .index("by_workspace_id_status", ["workspaceId", "status"])
        .index("by_workspace_id_assignee", ["workspaceId", "assigneeId"]),

    sprints: defineTable({
        name: v.string(),
        workspaceId: v.id("workspaces"),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        status: v.union(
            v.literal("planned"),
            v.literal("active"),
            v.literal("completed")
        ),
    }).index("by_workspace_id", ["workspaceId"]),

    taskComments: defineTable({
        taskId: v.id("tasks"),
        memberId: v.id("members"),
        workspaceId: v.id("workspaces"),
        body: v.string(),
    }).index("by_task_id", ["taskId"]),

    meetings: defineTable({
        workspaceId: v.id("workspaces"),
        roomName: v.string(),
        title: v.string(),
        createdBy: v.id("members"),
        startedAt: v.number(),
        endedAt: v.optional(v.number()),
        transcript: v.optional(v.string()),
        summary: v.optional(v.string()),
        participants: v.optional(v.array(v.string())),
        // members currently in the call; the meeting ends when this becomes empty
        activeMembers: v.optional(v.array(v.id("members"))),
        // members the host removed from this call; they cannot rejoin it
        kicked: v.optional(v.array(v.id("members"))),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_room_name", ["roomName"])
        .index("by_ended_started", ["endedAt", "startedAt"]),

    // Each participant's own transcript, merged when the meeting ends
    meetingTranscripts: defineTable({
        meetingId: v.id("meetings"),
        workspaceId: v.id("workspaces"),
        memberId: v.id("members"),
        // one line per utterance: "<epoch ms>\t<speaker>\t<text>"
        body: v.string(),
    }).index("by_meeting_id", ["meetingId"]),

    // One row per AI summary generated, used to enforce plan limits
    aiSummaryLog: defineTable({
        workspaceId: v.id("workspaces"),
        meetingId: v.id("meetings"),
        memberId: v.id("members"),
        // set once the AI call that this credit paid for succeeded
        consumed: v.optional(v.boolean()),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_meeting_id", ["meetingId"]),

    rateLimits: defineTable({
        key: v.string(),
        windowStart: v.number(),
        count: v.number(),
    }).index("by_key", ["key"]),

    docs: defineTable({
        title: v.string(),
        workspaceId: v.id("workspaces"),
        createdBy: v.id("members"),
        type: v.union(v.literal("document"), v.literal("spreadsheet")),
        liveblocksRoomId: v.string(),
        updatedAt: v.optional(v.number()),
        updatedBy: v.optional(v.id("members")),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_room_id", ["liveblocksRoomId"]),

    notifications: defineTable({
        workspaceId: v.id("workspaces"),
        recipientId: v.id("members"),
        senderId: v.id("members"),
        type: v.union(
            v.literal("thread_reply"),
            v.literal("reaction"),
            v.literal("task_assigned"),
            v.literal("task_comment"),
            v.literal("note_added"),
            v.literal("dm_received"),
            v.literal("mention")
        ),
        read: v.boolean(),
        messageId: v.optional(v.id("messages")),
        taskId: v.optional(v.id("tasks")),
        noteId: v.optional(v.id("notes")),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        body: v.optional(v.string()),
    })
        .index("by_recipient", ["recipientId"])
        .index("by_workspace_recipient", ["workspaceId", "recipientId"])
        .index("by_recipient_read", ["recipientId", "read"]),
});

export default schema;