import { defineSchema, defineTable } from "convex/server";
import {v} from 'convex/values';
import { authTables } from "@convex-dev/auth/server";


const schema = defineSchema({
        ...authTables,
        workspaces: defineTable({
                name: v.string(),
                userId: v.id("users"),
                joinCode: v.string()

        }),

        members: defineTable({
                userId: v.id("users"),
                workspaceId: v.id("workspaces"),
                role: v.union(v.literal("admin"), v.literal("member"))

        })

        .index("byUserId", ["userId"])
        .index("byWorkspaceId", ["workspaceId"])
        .index("byWorkspaceId_user_id", ["workspaceId", "userId"]),

        channels: defineTable({
                name: v.string(),
                workspaceId: v.id("workspaces")
        })
                .index("byWorkspaceId", ["workspaceId"]),

                conversations: defineTable({
                        workspaceId: v.id("workspaces"),
                        memberOneId: v.id("members"),
                        memberTwoId: v.id("members"),

                }) 
                .index("byWorkspaceId", ["workspaceId"]),

                messages: defineTable({
                        body: v.string(),
                        image: v.optional(v.id("_storage")),
                        memberId: v.id("members"),
                        workspaceId: v.id("workspaces"),
                        channelId: v.optional(v.id("channels")),
                        parentMessagesId: v.optional(v.id("messages")),

                        //add conversation id
                        conversationId: v.optional(v.id("conversations")),
                        updatedAt: v.optional(v.number())


                })
                .index("byWorkspaceId", ["workspaceId"])
                .index("by_member_id",["memberId"])
                .index("by_channel_id", ["channelId"])
                .index("by_conversation_id", ["conversationId"])
                .index(
                        "by_channel_id_parent_message_id_conversation_id",
                        ["channelId", "parentMessagesId", "conversationId"]
                      )
                .index("by_parent_message_id",["parentMessagesId"])

                .searchIndex("search_body", {
                        searchField: "body",
                        filterFields: ["workspaceId"]
                    })
,
                      reactions: defineTable({
                        workspaceId: v.id("workspaces"),
                        messageId: v.id("messages"),
                        memberId: v.id("members"),
                        value: v.string()
                      })

                      .index("byWorkspaceId", ["workspaceId"])
                      .index("by_message_id", ["messageId"])
                      .index("by_member_id", ["memberId"]) ,


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
                    .index("by_workspace_id_type", ["workspaceId", "type"])
                    .searchIndex("search_title", {
                        searchField: "title",
                        filterFields: ["workspaceId", "type"]
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
                        status: v.union(v.literal("planned"), v.literal("active"), v.literal("completed")),
                    })
                    .index("by_workspace_id", ["workspaceId"]),
                    
                    taskComments: defineTable({
                        taskId: v.id("tasks"),
                        memberId: v.id("members"),
                        workspaceId: v.id("workspaces"),
                        body: v.string(),
                    })
                    .index("by_task_id", ["taskId"]),

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
                    })
                    .index("by_workspace_id", ["workspaceId"])


                      
           
        
});

export default schema