import { normalizeDomain } from "./domain";
import { importImage, isImportedDomain, readImageUrl } from "./imports";
import { findLogo } from "./sources";
import type { LookupResult } from "./sources";

interface Env {
    BUCKET: R2Bucket;
    FILL_LIMIT: RateLimit;
    IMPORT_LIMIT: RateLimit;
}

const PREFIX = "merchants";
const IMPORT_PATH = "images";
const MAX_IMPORT_BODY = 4096;
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

async function importRoute(request: Request, env: Env, origin: string): Promise<Response> {
    if (Number(request.headers.get("content-length") ?? MAX_IMPORT_BODY + 1) > MAX_IMPORT_BODY) {
        return empty(413);
    }
    const { success } = await env.IMPORT_LIMIT.limit({ key: request.headers.get("cf-connecting-ip") ?? "unknown" });
    if (!success) {
        return tryLater();
    }
    const body = await request.text();
    const source = readImageUrl(body.trim());
    if (source === null) {
        return empty(400);
    }
    const result = await importImage((target, init) => fetch(target, init), source);
    if (result.kind === "unknown") {
        return tryLater();
    }
    if (result.kind === "rejected") {
        return empty(422);
    }
    // The source is kept so a reported image can be traced and removed.
    await env.BUCKET.put(`${PREFIX}/${result.domain}`, result.bytes, {
        customMetadata: { size: String(result.size), source: "import", url: source.href },
        httpMetadata: { cacheControl: LOGO_CACHE, contentType: result.contentType },
        onlyIf: { etagDoesNotMatch: "*" },
    });
    await caches.default.delete(new Request(`${origin}/${PREFIX}/${result.domain}`));
    return Response.json({ domain: result.domain }, { headers: { "cache-control": "no-store" } });
}

export async function handle(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const [, folder, raw, ...rest] = url.pathname.split("/");
    if (folder === IMPORT_PATH && raw === undefined) {
        return request.method === "POST" ? importRoute(request, env, url.origin) : empty(405, { allow: "POST" });
    }
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
    // Only an import fills these; a lookup would scrape a host that does not exist.
    if (isImportedDomain(domain)) {
        return empty(404, { "cache-control": "no-store" });
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
