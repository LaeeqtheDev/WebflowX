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
        theme: v.optional(v.union(
            v.literal("light"), v.literal("dark"), v.literal("system"),
            v.literal("snow"), v.literal("ash"), v.literal("onyx"), v.literal("midnight"), v.literal("forest"),
        )),
        // accent colour, message density, text size and motion; follows the member across devices
        look: v.optional(v.object({
            accent: v.union(v.literal("ember"), v.literal("ocean"), v.literal("violet"), v.literal("emerald"), v.literal("rose"), v.literal("teal"), v.literal("gold"), v.literal("slate")),
            density: v.union(v.literal("cozy"), v.literal("compact")),
            fontScale: v.union(v.literal(90), v.literal(100), v.literal(112), v.literal(125)),
            reducedMotion: v.boolean(),
        })),
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
        // when on, members must have two-step verification switched on to use the workspace (Growth and up)
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
        // Stripe billing (written only by the webhook and the checkout actions)
        stripeCustomerId: v.optional(v.string()),
        stripeSubscriptionId: v.optional(v.string()),
        billingStatus: v.optional(v.string()),
        billingInterval: v.optional(v.union(v.literal("month"), v.literal("year"))),
        billingPeriodEnd: v.optional(v.number()),
        billingTrialEnd: v.optional(v.number()),
        cancelAtPeriodEnd: v.optional(v.boolean()),
    })
        .index("by_user_id", ["userId"])
        .index("by_stripe_customer", ["stripeCustomerId"]),

    // Stripe webhook events already handled (Stripe can deliver the same event more than once)
    stripeEvents: defineTable({ eventId: v.string() }).index("by_event_id", ["eventId"]),

    // Refunds and disputes on a workspace's payments, as Stripe reports them (written only by the webhook and the
    // refund action). Amounts are in the currency's smallest unit, so 2900 is $29.00.
    billingAdjustments: defineTable({
        workspaceId: v.id("workspaces"),
        kind: v.union(v.literal("refund"), v.literal("dispute")),
        stripeId: v.string(),
        chargeId: v.string(),
        amount: v.number(),
        currency: v.string(),
        status: v.string(),
        reason: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_stripe_id", ["stripeId"])
        .index("by_workspace", ["workspaceId", "createdAt"]),

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
        // posted by one of the workspace's AI agents (shown with an "Agent" badge)
        agent: v.optional(v.boolean()),
        // set when the author left or was removed: their name and photo as they were, so the message still reads properly
        removedAuthor: v.optional(v.object({ name: v.string(), image: v.optional(v.string()) })),
        // when a removed author's message is erased (Free plan: 90 days after they left). Unset on paid plans, which keep full history.
        retainUntil: v.optional(v.number()),
        // Summary of this message's thread, kept up to date as replies come and go, so listing a channel reads one
        // document per message instead of up to 200 replies. Unset on messages with no thread and on threads created
        // before this existed (those are counted the old way until maintenance.backfillThreads has run).
        threadCount: v.optional(v.number()),
        threadLastAt: v.optional(v.number()),
        threadLastMemberId: v.optional(v.id("members")),
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
        .index("by_retain_until", ["retainUntil"])
        .searchIndex("search_body", {
            searchField: "body",
            filterFields: ["workspaceId"],
        }),

    reactions: defineTable({
        workspaceId: v.id("workspaces"),
        messageId: v.id("messages"),
        memberId: v.id("members"),
        value: v.string(),
        // set when the reacting member left; erased after this time (Free plan only)
        retainUntil: v.optional(v.number()),
    })
        .index("byWorkspaceId", ["workspaceId"])
        .index("by_message_id", ["messageId"])
        .index("by_member_id", ["memberId"])
        .index("by_retain_until", ["retainUntil"]),

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
        // where the task came from, so people (and agents' work) can be traced back
        sourceMeetingId: v.optional(v.id("meetings")),
        sourceMessageId: v.optional(v.id("messages")),
        // a subtask points at its parent task
        parentTaskId: v.optional(v.id("tasks")),
        // the due date an overdue nudge was already sent for
        overdueNudgedFor: v.optional(v.number()),
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
        // "workspace" (default): everyone in the workspace can join. "oneToOne": only the host and the invitee, 15 minutes at most.
        kind: v.optional(v.union(v.literal("workspace"), v.literal("oneToOne"))),
        inviteeId: v.optional(v.id("members")),
        // set for a meeting planned ahead; startedAt then holds the planned start
        scheduledFor: v.optional(v.number()),
        // soft delete: the row stays so plan usage still counts it, but its content is gone and it is hidden
        deletedAt: v.optional(v.number()),
        // a made-up meeting created by "Try it on a sample meeting"; never counted against the plan
        sample: v.optional(v.boolean()),
        // workspace guests (e.g. clients) the host invited to this meeting; guests see and join only these
        guestIds: v.optional(v.array(v.id("members"))),
        // a secret join link for people without an account (e.g. a client); unset = no link
        publicToken: v.optional(v.string()),
        // the brief written 30 minutes before a scheduled meeting (Meeting prep automation)
        prep: v.optional(v.string()),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_workspace_started", ["workspaceId", "startedAt"])
        .index("by_room_name", ["roomName"])
        .index("by_public_token", ["publicToken"])
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
    // AI agents a workspace has switched on. They act for the admin who set them up.
    agents: defineTable({
        workspaceId: v.id("workspaces"),
        // meetingFollowUp: tasks + recap after a meeting; triage: turns requests in chat into tasks
        // standup: a short morning post of what got done, what's due and what's stuck
        // assistant: answers "@agent" questions in chat and makes tasks when asked, as the person asking
        kind: v.union(v.literal("meetingFollowUp"), v.literal("triage"), v.literal("standup"), v.literal("assistant")),
        enabled: v.boolean(),
        // "suggest": proposals wait for someone to approve them; "act": they are carried out straight away
        mode: v.union(v.literal("suggest"), v.literal("act")),
        // where the agent posts its recap (none = no recap)
        channelId: v.optional(v.id("channels")),
        // triage: the public channels it watches
        channelIds: v.optional(v.array(v.id("channels"))),
        // standup: when to post, in the admin's time zone, and the local day it last posted
        postHour: v.optional(v.number()),
        postTz: v.optional(v.string()),
        weekdaysOnly: v.optional(v.boolean()),
        lastRunDay: v.optional(v.string()),
        createdBy: v.id("members"),
        updatedAt: v.number(),
    })
        .index("by_workspace_kind", ["workspaceId", "kind"])
        .index("by_kind_enabled", ["kind", "enabled"]),

    // One piece of work an agent did. Counted against the plan's monthly agent runs.
    agentRuns: defineTable({
        workspaceId: v.id("workspaces"),
        agentId: v.id("agents"),
        // a "Try it on a sample meeting" run: free, never counted against the plan
        sample: v.optional(v.boolean()),
        meetingId: v.optional(v.id("meetings")),
        // triage: the channel and the messages it was asked to look at (gathered for a minute, then read together)
        channelId: v.optional(v.id("channels")),
        messageIds: v.optional(v.array(v.id("messages"))),
        // who set it off (the person whose summary triggered it, or who pressed "run")
        startedBy: v.id("members"),
        status: v.union(
            v.literal("queued"), v.literal("running"), v.literal("review"),
            v.literal("done"), v.literal("failed"), v.literal("dismissed"),
        ),
        actions: v.array(v.union(
            v.object({
                id: v.string(),
                type: v.literal("task"),
                title: v.string(),
                assigneeId: v.optional(v.id("members")),
                dueDate: v.optional(v.number()),
                priority: v.union(v.literal("urgent"), v.literal("high"), v.literal("medium"), v.literal("low")),
                // triage: the chat message it came from (the agent replies under it)
                sourceMessageId: v.optional(v.id("messages")),
                // a subtask of an existing task
                parentTaskId: v.optional(v.id("tasks")),
                // set once carried out
                taskId: v.optional(v.id("tasks")),
            }),
            v.object({
                id: v.string(),
                type: v.literal("recap"),
                channelId: v.id("channels"),
                text: v.string(),
                // posted as a thread reply under this message (the assistant's answers)
                parentMessageId: v.optional(v.id("messages")),
                messageId: v.optional(v.id("messages")),
            }),
            // @agent scheduling a workspace meeting
            v.object({
                id: v.string(),
                type: v.literal("meeting"),
                title: v.string(),
                startsAt: v.number(),
                meetingId: v.optional(v.id("meetings")),
            }),
            // @agent drafting a doc page (it opens with this content)
            v.object({
                id: v.string(),
                type: v.literal("doc"),
                title: v.string(),
                html: v.string(),
                docId: v.optional(v.id("docs")),
            }),
            // @agent changing an existing task ("mark the checkout fix done", "move it to Friday")
            v.object({
                id: v.string(),
                type: v.literal("update"),
                taskId: v.id("tasks"),
                title: v.string(),
                status: v.optional(v.union(v.literal("backlog"), v.literal("todo"), v.literal("in_progress"), v.literal("in_review"), v.literal("done"))),
                assigneeId: v.optional(v.id("members")),
                dueDate: v.optional(v.number()),
                priority: v.optional(v.union(v.literal("urgent"), v.literal("high"), v.literal("medium"), v.literal("low"))),
                // set once carried out
                applied: v.optional(v.boolean()),
            }),
        )),
        // the agent's own one-line note on what it did
        note: v.optional(v.string()),
        error: v.optional(v.string()),
        steps: v.optional(v.number()),
        // what the run cost: the model used, tokens in/out and the estimated price in US dollars
        model: v.optional(v.string()),
        tokensIn: v.optional(v.number()),
        tokensOut: v.optional(v.number()),
        costUsd: v.optional(v.number()),
        decidedBy: v.optional(v.id("members")),
        finishedAt: v.optional(v.number()),
    })
        .index("by_workspace_id", ["workspaceId"])
        .index("by_meeting_id", ["meetingId"])
        .index("by_channel_status", ["channelId", "status"]),

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
        .index("by_token", ["token"])
        .index("by_status", ["status"]),

    docs: defineTable({
        title: v.string(),
        workspaceId: v.id("workspaces"),
        createdBy: v.id("members"),
        type: v.union(v.literal("document"), v.literal("spreadsheet"), v.literal("database")),
        liveblocksRoomId: v.string(),
        // HTML the editor starts the page with the first time it's opened (a draft written by @agent)
        seedHtml: v.optional(v.string()),
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
        // top-level pages of a workspace, found directly instead of by scanning every page and filtering
        .index("by_workspace_parent", ["workspaceId", "parentId"])
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
            v.literal("task_due"),
            v.literal("meeting_invite"),
            v.literal("doc_comment"),
            v.literal("doc_mention"),
            // a reminder from an automation (overdue task, unanswered question, missing summary, meeting prep)
            v.literal("agent_nudge")
        ),
        read: v.boolean(),
        messageId: v.optional(v.id("messages")),
        taskId: v.optional(v.id("tasks")),
        noteId: v.optional(v.id("notes")),
        meetingId: v.optional(v.id("meetings")),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        docId: v.optional(v.id("docs")),
        body: v.optional(v.string()),
    })
        .index("by_recipient", ["recipientId"])
        .index("by_workspace_recipient", ["workspaceId", "recipientId"])
        .index("by_recipient_read", ["recipientId", "read"])
        .index("by_recipient_read_type", ["recipientId", "read", "type"]),

    // ---------- agents: memory, budget, Ask panel, automations ----------

    // What the agents can search: channel messages, meeting summaries, tasks, doc text and decisions, one row each.
    // Filled by knowledge.indexTick. Permissions are checked again whenever an agent reads a row. DMs are never indexed.
    knowledge: defineTable({
        workspaceId: v.id("workspaces"),
        kind: v.union(v.literal("message"), v.literal("meeting"), v.literal("task"), v.literal("doc"), v.literal("decision")),
        refId: v.string(),
        channelId: v.optional(v.id("channels")),
        title: v.string(),
        text: v.string(),
        at: v.number(),
    })
        .index("by_ref", ["refId"])
        .searchIndex("search_text", { searchField: "text", filterFields: ["workspaceId", "kind"] }),
    knowledgeCursor: defineTable({
        kind: v.string(),
        newest: v.number(),
        oldest: v.optional(v.number()),
        backfillDone: v.optional(v.boolean()),
    }).index("by_kind", ["kind"]),

    // AI tokens and calls used per UTC day and model, across every workspace (the Groq free tier limit is per account)
    aiUsage: defineTable({
        day: v.string(),
        model: v.string(),
        tokens: v.number(),
        calls: v.number(),
    }).index("by_day_model", ["day", "model"]),

    // Ask WebflowX: a private chat with the agent
    askThreads: defineTable({
        workspaceId: v.id("workspaces"),
        memberId: v.id("members"),
        title: v.string(),
        updatedAt: v.number(),
    }).index("by_member", ["memberId", "updatedAt"]),
    askMessages: defineTable({
        threadId: v.id("askThreads"),
        role: v.union(v.literal("user"), v.literal("assistant")),
        text: v.string(),
        status: v.optional(v.union(v.literal("thinking"), v.literal("done"), v.literal("error"))),
        steps: v.optional(v.array(v.string())),
        sources: v.optional(v.array(v.object({
            n: v.number(),
            kind: v.union(v.literal("message"), v.literal("meeting"), v.literal("task"), v.literal("doc"), v.literal("decision")),
            refId: v.string(),
            channelId: v.optional(v.string()),
            title: v.string(),
        }))),
    }).index("by_thread", ["threadId"]),

    // Automations an admin switched on (overdue nudges, unanswered questions, missing summaries, meeting prep,
    // decisions log, weekly digest). Missing row = off.
    automations: defineTable({
        workspaceId: v.id("workspaces"),
        key: v.string(),
        enabled: v.boolean(),
        channelId: v.optional(v.id("channels")),
        updatedBy: v.id("members"),
    }).index("by_workspace_key", ["workspaceId", "key"]).index("by_key_enabled", ["key", "enabled"]),
    // what an automation already did, so it never repeats itself
    automationLog: defineTable({
        key: v.string(),
        refId: v.string(),
    }).index("by_key_ref", ["key", "refId"]),

    // Decisions pulled out of meeting summaries (the Decisions log)
    decisions: defineTable({
        workspaceId: v.id("workspaces"),
        meetingId: v.optional(v.id("meetings")),
        text: v.string(),
    }).index("by_workspace", ["workspaceId"]).index("by_meeting", ["meetingId"]),

    // When each person last read a channel, for the "New messages" line
    channelReads: defineTable({
        memberId: v.id("members"),
        channelId: v.id("channels"),
        lastReadAt: v.number(),
    }).index("by_member_channel", ["memberId", "channelId"]),

    // Comments on a doc, optionally quoting the text they're about; replies point at their parent
    docComments: defineTable({
        docId: v.id("docs"),
        workspaceId: v.id("workspaces"),
        memberId: v.id("members"),
        body: v.string(),
        quote: v.optional(v.string()),
        parentId: v.optional(v.id("docComments")),
        resolved: v.optional(v.boolean()),
        editedAt: v.optional(v.number()),
    }).index("by_doc", ["docId"]),

    // Saved copies of a doc's content (HTML), made automatically while people edit and on demand
    docVersions: defineTable({
        docId: v.id("docs"),
        workspaceId: v.id("workspaces"),
        memberId: v.id("members"),
        title: v.string(),
        html: v.string(),
        label: v.optional(v.string()),
    }).index("by_doc", ["docId"]),
});

export default schema;