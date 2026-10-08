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
        // false turns off browser push notifications. Default is on once a device has subscribed.
        pushNotifications: v.optional(v.boolean()),
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

    // API keys, incoming webhooks, GitHub hooks and outgoing webhooks. Secrets in URLs / keys are stored hashed.
    integrations: defineTable({
        workspaceId: v.id("workspaces"),
        kind: v.union(v.literal("apiKey"), v.literal("incoming"), v.literal("github"), v.literal("outgoing")),
        name: v.string(),
        createdBy: v.id("members"),
        tokenHash: v.optional(v.string()),
        prefix: v.optional(v.string()),
        channelId: v.optional(v.id("channels")),
        url: v.optional(v.string()),
        // signs outgoing deliveries / verifies GitHub deliveries
        secret: v.optional(v.string()),
        events: v.optional(v.array(v.string())),
        // outgoing webhooks only: also send events from locked channels (off unless an admin turns it on)
        includePrivate: v.optional(v.boolean()),
        active: v.boolean(),
        lastUsedAt: v.optional(v.number()),
        failCount: v.optional(v.number()),
        lastStatus: v.optional(v.string()),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_workspace_kind", ["workspaceId", "kind"])
        .index("by_token_hash", ["tokenHash"]),

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
        // when on, the invite link works without the 6-character code (still revoked by turning invites off)
        openInviteLink: v.optional(v.boolean()),
        // when on, members must have two-step verification switched on to use the workspace (Business and up)
        require2fa: v.optional(v.boolean()),
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
        role: v.union(v.literal("admin"), v.literal("moderator"), v.literal("member"), v.literal("guest")),
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
        // guests (limited members) who may open this channel; guests can open nothing else
        guestIds: v.optional(v.array(v.id("members"))),
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
        imageName: v.optional(v.string()),
        fileType: v.optional(v.string()),
        fileSize: v.optional(v.number()),
        memberId: v.id("members"),
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        parentMessagesId: v.optional(v.id("messages")),
        conversationId: v.optional(v.id("conversations")),
        updatedAt: v.optional(v.number()),
        // set when an API key, webhook or GitHub hook posted this; shown in place of the author's name
        integrationName: v.optional(v.string()),
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
        // the due date a reminder was already sent for, so each deadline reminds once
        reminderSentFor: v.optional(v.number()),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_workspace_due", ["workspaceId", "dueDate"])
        .index("by_due_date", ["dueDate"])
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

    // one row per file or image attached to a message, so the Files page can list and search them
    attachments: defineTable({
        workspaceId: v.id("workspaces"),
        messageId: v.id("messages"),
        memberId: v.id("members"),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        kind: v.union(v.literal("image"), v.literal("file")),
        name: v.string(),
        contentType: v.string(),
        size: v.number(),
        storageId: v.id("_storage"),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_message_id", ["messageId"])
        .index("by_member_id", ["memberId"])
        .searchIndex("search_name", { searchField: "name", filterFields: ["workspaceId", "kind"] }),

    // last time each person had the app open (updated every ~30 seconds while a tab is visible)
    presence: defineTable({
        userId: v.id("users"),
        lastSeen: v.number(),
    }).index("by_user_id", ["userId"]),

    // "someone is typing" markers; they expire a few seconds after the last keystroke
    typing: defineTable({
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        memberId: v.id("members"),
        until: v.number(),
    })
        .index("by_channel_id", ["channelId"])
        .index("by_conversation_id", ["conversationId"])
        .index("by_until", ["until"]),

    // messages pinned to a channel or conversation (visible to everyone who can open it)
    pins: defineTable({
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        messageId: v.id("messages"),
        pinnedBy: v.id("members"),
    })
        .index("by_channel_id", ["channelId"])
        .index("by_conversation_id", ["conversationId"])
        .index("by_message_id", ["messageId"])
        .index("by_workspace_id", ["workspaceId"]),

    // a member's private "saved for later" list
    savedMessages: defineTable({
        workspaceId: v.id("workspaces"),
        memberId: v.id("members"),
        messageId: v.id("messages"),
    })
        .index("by_member_id", ["memberId"])
        .index("by_member_message", ["memberId", "messageId"])
        .index("by_message_id", ["messageId"])
        .index("by_workspace_id", ["workspaceId"]),

    // browser push subscriptions, one per device
    pushSubscriptions: defineTable({
        userId: v.id("users"),
        endpoint: v.string(),
        p256dh: v.string(),
        authKey: v.string(),
    })
        .index("by_user_id", ["userId"])
        .index("by_endpoint", ["endpoint"]),

    // two-step verification (authenticator app). One row per user once setup has started.
    twoFactor: defineTable({
        userId: v.id("users"),
        secret: v.string(), // base32
        enabled: v.boolean(),
        // sha-256 of each unused backup code
        backupCodes: v.array(v.string()),
        // last accepted 30-second step, so a code can't be used twice
        lastStep: v.optional(v.number()),
    }).index("by_user_id", ["userId"]),

    // which sign-in sessions have passed the second step
    twoFactorSessions: defineTable({
        userId: v.id("users"),
        sessionId: v.id("authSessions"),
        verifiedAt: v.number(),
    })
        .index("by_session_id", ["sessionId"])
        .index("by_user_id", ["userId"]),

    // secret link that lets a calendar app (Google Calendar, Outlook, Apple) subscribe to my due dates
    calendarFeeds: defineTable({
        userId: v.id("users"),
        token: v.string(),
    })
        .index("by_user_id", ["userId"])
        .index("by_token", ["token"]),

    newsletterSubscribers: defineTable({
        email: v.string(), // lowercased
        status: v.union(v.literal("pending"), v.literal("subscribed"), v.literal("unsubscribed")),
        token: v.string(),
        source: v.optional(v.string()),
        subscribedAt: v.optional(v.number()),
        unsubscribedAt: v.optional(v.number()),
    })
        .index("by_email", ["email"])
        .index("by_token", ["token"]),

    docs: defineTable({
        title: v.string(),
        workspaceId: v.id("workspaces"),
        createdBy: v.id("members"),
        type: v.union(v.literal("document"), v.literal("spreadsheet"), v.literal("database")),
        liveblocksRoomId: v.string(),
        updatedAt: v.optional(v.number()),
        updatedBy: v.optional(v.id("members")),
        // page tree: a page can sit inside another page
        parentId: v.optional(v.id("docs")),
        position: v.optional(v.number()),
        icon: v.optional(v.string()),
        // set when moved to the trash; everything deleted together shares one timestamp
        deletedAt: v.optional(v.number()),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_room_id", ["liveblocksRoomId"])
        .index("by_parent_id", ["parentId"])
        .index("by_deleted_at", ["deletedAt"]),

    // pages a member starred
    docFavorites: defineTable({
        workspaceId: v.id("workspaces"),
        memberId: v.id("members"),
        docId: v.id("docs"),
    })
        .index("by_member_id", ["memberId"])
        .index("by_doc_id", ["docId"])
        .index("by_workspace_id", ["workspaceId"]),

    // running row totals ("db:<docId>" per database, "ws:<workspaceId>" per workspace); kept apart from the
    // documents people watch so counting never refreshes anyone's screen
    dbCounts: defineTable({
        key: v.string(),
        workspaceId: v.id("workspaces"),
        count: v.number(),
    })
        .index("by_key", ["key"])
        .index("by_workspace_id", ["workspaceId"]),

    // page templates a workspace saved from its own pages (content kept as HTML)
    docTemplates: defineTable({
        workspaceId: v.id("workspaces"),
        createdBy: v.id("members"),
        name: v.string(),
        icon: v.optional(v.string()),
        html: v.string(),
    }).index("by_workspace_id", ["workspaceId"]),

    // a database is a page of type "database"; this holds its properties and views
    dbConfigs: defineTable({
        docId: v.id("docs"),
        workspaceId: v.id("workspaces"),
        properties: v.array(v.any()),
        views: v.array(v.any()),
    })
        .index("by_doc_id", ["docId"])
        .index("by_workspace_id", ["workspaceId"]),

    // one row of a database; opened as a page of its own
    dbRows: defineTable({
        databaseId: v.id("docs"),
        workspaceId: v.id("workspaces"),
        title: v.string(),
        values: v.any(),
        position: v.number(),
        createdBy: v.id("members"),
        updatedAt: v.number(),
        updatedBy: v.optional(v.id("members")),
        roomId: v.string(),
        hasBody: v.optional(v.boolean()),
    })
        .index("by_database_id", ["databaseId"])
        .index("by_room_id", ["roomId"])
        .index("by_workspace_id", ["workspaceId"]),

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
            v.literal("mention"),
            v.literal("task_due")
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