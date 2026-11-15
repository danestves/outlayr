import { getSessionCookie } from "better-auth/cookies";

const JWT_COOKIE = "convex_jwt";

// Neither cookie means no token can be minted, so the server skips the round trip to ask for one.
export const signedOutOf = (headers: Headers) =>
    !getSessionCookie(headers, { cookieName: JWT_COOKIE }) && !getSessionCookie(headers);
