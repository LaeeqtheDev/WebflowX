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
                        workspaceId: v.id("wokrspaces"),
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
                        updatedAt: v.number()


                })
                .index("byWorkspaceId", ["workspaceId"])
                .index("by_member_id",["memberId"])
                .index("by_channel_id", ["channelId"])
                .index("by_conversation_id", ["conversationId"])
                .index(
                        "by_channel_id_parent_message_id_conversation_id",
                        ["channelId", "parentMessagesId", "conversationId"]
                      ),

                      reactions: defineTable({
                        workspaceId: v.id("workspaces"),
                        messageId: v.id("messages"),
                        memberId: v.id("members"),
                        value: v.string()
                      })

                      .index("byWorkspaceId", ["workspaceId"])
                      .index("by_message_id", ["memberId"])
                      .index("by_member_id", ["memberId"]) 
           
        
});

export default schema