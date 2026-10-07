import { convexAuth, getAuthSessionId } from "@convex-dev/auth/server";
import type { GenericDatabaseReader } from "convex/server";
import type { Auth } from "convex/server";
import Github from '@auth/core/providers/github'
import Google from '@auth/core/providers/google'
import { Password } from "@convex-dev/auth/providers/Password";
import {DataModel} from './_generated/dataModel'
import { ResendVerify, ResendReset } from "./ResendOTP"


// Email codes need a Resend key. Without one the app keeps working with plain password sign-in,
// so nobody gets locked out before the key is configured.
const emailEnabled = !!process.env.AUTH_RESEND_KEY

const customPassword = Password<DataModel>({
  profile(params){
    return{
      email: params.email as string,
      name: String(params.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || undefined,

    }
  },
  ...(emailEnabled ? { verify: ResendVerify, reset: ResendReset } : {}),
})


const base = convexAuth({
  providers:[customPassword, Github, Google]
});

export const { signIn, signOut, store, isAuthenticated } = base

// The plain sign-in check. Only the two-step verification functions use this directly, because they
// must work for someone who has signed in but not yet entered their code.
export const rawAuth = base.auth

type Ctx = { auth: Auth; db?: GenericDatabaseReader<DataModel> }

// Everything else goes through this. If the person has two-step verification on and this sign-in session has not
// passed the code step yet, they count as signed out, so a stolen password alone can't read or change anything.
export const auth = {
  ...base.auth,
  getUserId: async (ctx: Ctx) => {
    const userId = await base.auth.getUserId(ctx)
    if (!userId || !ctx.db) return userId
    const tf = await ctx.db.query("twoFactor").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique()
    if (!tf?.enabled) return userId
    const sessionId = await getAuthSessionId(ctx)
    if (!sessionId) return null
    const passed = await ctx.db.query("twoFactorSessions").withIndex("by_session_id", (q) => q.eq("sessionId", sessionId)).first()
    return passed ? userId : null
  },
}
