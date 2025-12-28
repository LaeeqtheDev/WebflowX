import { convexAuth } from "@convex-dev/auth/server";
import Github from '@auth/core/providers/github'
import Google from '@auth/core/providers/google'
import {Password} from '@convex-dev/auth/providers/password'


export const { auth, signIn, signOut, store, isAuthenticated  } = convexAuth({
  providers: [Password, Github, Google]
});
