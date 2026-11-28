import { jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";

// Better Auth's convex plugin sets this cookie; `__Secure-` is the name it takes on https.
const JWT_COOKIES = ["__Secure-better-auth.convex_jwt", "better-auth.convex_jwt"] as const;
const BEARER = "Bearer ";

export interface Session {
    readonly token: string;
    readonly userId: string;
}

function cookieValue(header: string, name: string): string | null {
    for (const part of header.split(";")) {
        const separator = part.indexOf("=");
        if (separator !== -1 && part.slice(0, separator).trim() === name) {
            return part.slice(separator + 1).trim() || null;
        }
    }
    return null;
}

export function sessionToken(request: Request): string | null {
    const authorization = request.headers.get("authorization");
    if (authorization?.startsWith(BEARER)) {
        return authorization.slice(BEARER.length).trim() || null;
    }
    const cookies = request.headers.get("cookie");
    if (cookies === null) {
        return null;
    }
    for (const name of JWT_COOKIES) {
        const value = cookieValue(cookies, name);
        if (value !== null) {
            return value;
        }
    }
    return null;
}

// Mirrors `optionalUserId` in the backend: a guest only holds a purchase, so it owns no photos. Unlike Convex this
// cannot see a revoked session, so a signed-out token keeps reading its own photos until it expires.
export async function verifySession(token: string, keys: JWTVerifyGetKey, issuer: string): Promise<Session | null> {
    try {
        const { payload } = await jwtVerify(token, keys, { algorithms: ["RS256"], audience: "convex", issuer });
        if (!payload.sub || payload["isAnonymous"] === true) {
            return null;
        }
        return { token, userId: payload.sub };
    } catch {
        return null;
    }
}
