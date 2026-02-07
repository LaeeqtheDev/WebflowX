import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { auth } from './auth';

export const create = mutation({
    args:{
        name: v.string(),
    },
    handler: async(ctx, args) => {
     const userId = await auth.getUserId(ctx);
     
     if(!userId){
        throw new Error("Unauthorized");
     }

     const joinCode = "123456"

     const workSpaceId = await ctx.db.insert("workspaces", {
        name: args.name,
        userId,
        joinCode
     })

     return workSpaceId;

    }
})



export const get = query({
    args:{},
    handler: async(ctx) => {
     return  await ctx.db.query("workspaces").collect();
    }
})




  export const getById = query({
    args: {id: v.id("workspaces")},
    handler: async(ctx, args) => {
        const userId = await auth.getUserId(ctx);

        if(!userId){
            throw new Error("Unauthorized");
        }

        return await ctx.db.get(args.id)
    }
  })