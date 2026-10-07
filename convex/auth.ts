import { convexAuth } from "@convex-dev/auth/server";
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
      name: params.name as string

    }
  },
  ...(emailEnabled ? { verify: ResendVerify, reset: ResendReset } : {}),
})


export const { auth, signIn, signOut, store, isAuthenticated  } = convexAuth({
  providers:[customPassword, Github, Google]
});
