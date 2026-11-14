import { getSessionCookie } from "better-auth/cookies";

const JWT_COOKIE = "convex_jwt";

export type TokenWait = "none" | "round-trip" | "signed-out";

export function tokenWaitOf(headers: Headers): TokenWait {
    if (getSessionCookie(headers, { cookieName: JWT_COOKIE })) {
        return "none";
    }
    return getSessionCookie(headers) ? "round-trip" : "signed-out";
}
