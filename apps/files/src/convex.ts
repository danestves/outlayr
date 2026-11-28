import * as Schema from "effect/Schema";

import type { ReadUrl } from "./photos";

const READ_TIMEOUT_MS = 5000;
// Also how long a removed profile member keeps reading a shared photo, on top of the browser's own cache.
const GRANT_TTL_MS = 5 * 60 * 1000;
const GRANT_LIMIT = 10_000;

const decodeReply = Schema.decodeUnknownSync(
    Schema.Struct({
        status: Schema.Literal("success"),
        value: Schema.Array(Schema.Struct({ key: Schema.String, url: Schema.String })),
    })
);

async function readUrlFromConvex(convexUrl: string, token: string, key: string): Promise<string | null> {
    const response = await fetch(new URL("/api/mutation", convexUrl), {
        body: JSON.stringify({ args: { keys: [key] }, format: "json", path: "photos:readUrls" }),
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`photos:readUrls answered ${response.status}`);
    }
    const reply = decodeReply(await response.json());
    return reply.value.find((entry) => entry.key === key)?.url ?? null;
}

// Per isolate, so a page of shared photos asks Convex once per photo, not once per view.
export function convexReadUrl(convexUrl: string): ReadUrl {
    const grants = new Map<string, { expires: number; url: string | null }>();
    return async (session, key) => {
        const id = `${session.userId}\n${key}`;
        const now = Date.now();
        const kept = grants.get(id);
        if (kept !== undefined && kept.expires > now) {
            return kept.url;
        }
        const url = await readUrlFromConvex(convexUrl, session.token, key);
        if (grants.size >= GRANT_LIMIT) {
            grants.clear();
        }
        grants.set(id, { expires: now + GRANT_TTL_MS, url });
        return url;
    };
}
