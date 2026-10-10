// Is this sign-in token present and not expired? Read straight from the token, with no network call.
// The middleware used to ask the database "is this person signed in?" on every page request, which cost a database call
// and a round trip each time (and made up about 40% of all function calls). This is only for choosing where to send a
// visitor: whether they can read any data is still decided by the database on every query, which checks the signature.
export const tokenLooksValid = (token: string | null | undefined, now = Date.now()): boolean => {
  if (!token) return false
  const part = token.split(".")[1]
  if (!part) return false
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === "number" && exp * 1000 > now + 10_000
  } catch {
    return false
  }
}
