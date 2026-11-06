import { normalizeDomain } from "./domain";
import { findLogo } from "./sources";
import type { LookupResult } from "./sources";

interface Env {
    BUCKET: R2Bucket;
    FILL_LIMIT: RateLimit;
}

const PREFIX = "merchants";
const LOGO_CACHE = "public, max-age=2592000, stale-while-revalidate=604800";
const MISS_CACHE = "public, max-age=86400";
const RETRY_AFTER_SECONDS = "30";
// Must stay under the app's 6 second request timeout.
const FILL_BUDGET_MS = 5000;

function logoHeaders(object: R2Object): Headers {
    const headers = new Headers({
        "access-control-allow-origin": "*",
        "cache-control": LOGO_CACHE,
        etag: object.httpEtag,
        "x-content-type-options": "nosniff",
    });
    object.writeHttpMetadata(headers);
    return headers;
}

const empty = (status: number, headers: Record<string, string> = {}) => new Response(null, { headers, status });

const tryLater = () => empty(503, { "cache-control": "no-store", "retry-after": RETRY_AFTER_SECONDS });

async function fill(env: Env, key: string, domain: string): Promise<LookupResult["kind"]> {
    const result = await findLogo((url, init) => fetch(url, init), domain);
    if (result.kind === "found") {
        const { bytes, contentType, size, source } = result.logo;
        // Writes only if absent, so a lookup never replaces a logo placed by hand.
        await env.BUCKET.put(key, bytes, {
            customMetadata: { size: String(size), source },
            httpMetadata: { cacheControl: LOGO_CACHE, contentType },
            onlyIf: { etagDoesNotMatch: "*" },
        });
    }
    return result.kind;
}

const budget = () =>
    new Promise<"timeout">((resolve) => {
        setTimeout(() => resolve("timeout"), FILL_BUDGET_MS);
    });

export async function handle(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const [, folder, raw, ...rest] = url.pathname.split("/");
    // The same bucket holds users' private photos.
    if (folder !== PREFIX || raw === undefined || rest.length > 0) {
        return empty(404);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
        return empty(405, { allow: "GET, HEAD" });
    }
    const domain = normalizeDomain(decodeURIComponent(raw));
    if (domain === null) {
        return empty(404);
    }

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/${PREFIX}/${domain}`, { headers: request.headers, method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) {
        return cached;
    }

    const key = `${PREFIX}/${domain}`;
    const serve = async () => {
        const object = await env.BUCKET.get(key, { onlyIf: request.headers });
        if (object === null) {
            return null;
        }
        const headers = logoHeaders(object);
        if (!("body" in object)) {
            return new Response(null, { headers, status: 304 });
        }
        const response = new Response(object.body, { headers });
        context.waitUntil(cache.put(cacheKey, response.clone()));
        return request.method === "HEAD" ? new Response(null, { headers }) : response;
    };

    const stored = await serve();
    if (stored) {
        return stored;
    }

    const { success } = await env.FILL_LIMIT.limit({ key: request.headers.get("cf-connecting-ip") ?? "unknown" });
    if (!success) {
        return tryLater();
    }

    const filling = fill(env, key, domain);
    context.waitUntil(filling.catch(() => "unknown"));
    const outcome = await Promise.race([filling.catch(() => "unknown" as const), budget()]);
    if (outcome === "found") {
        return (await serve()) ?? tryLater();
    }
    if (outcome === "missing") {
        const miss = empty(404, { "cache-control": MISS_CACHE });
        context.waitUntil(cache.put(cacheKey, miss.clone()));
        return miss;
    }
    return tryLater();
}

export default { fetch: handle } satisfies ExportedHandler<Env>;
