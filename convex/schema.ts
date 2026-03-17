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

                messages: defineTable({
                        body: v.string(),
                        image: v.optional(v.id("_storage")),
                        memberId: v.id("members"),
                        workspaceId: v.id("workspaces"),
                        channelId: v.optional(v.id("channels")),
                        parentMessagesId: v.optional(v.id("messages")),
                        updatedAt: v.number()


                })


           
        
});

export default schema