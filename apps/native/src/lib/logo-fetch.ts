import { env } from "@outlayr/env/native";

import { isRealLogo } from "@/domain/logo-acceptance";

const REQUEST_TIMEOUT_MS = 3000;
/** A cold TLS handshake can alone exceed the budget; the retry reuses the connection. */
const TIMEOUT_ATTEMPTS = 2;

export type LogoOutcome = { kind: "logo"; bytes: Uint8Array } | { kind: "none" };

const NONE: LogoOutcome = { kind: "none" };

/** A non-definitive "none" (timeout, rate limit, server error) must never be cached as a miss. */
type TierOutcome = { kind: "logo"; bytes: Uint8Array } | { definitive: boolean; kind: "none" };

const INDETERMINATE: TierOutcome = { definitive: false, kind: "none" };
const REFUSED: TierOutcome = { definitive: true, kind: "none" };

const NOT_FOUND = 404;
const OK_MIN = 200;
const OK_MAX = 299;

/** A rejected 2xx counts: the host looked and served a placeholder. */
function refused(status: number): boolean {
    return status === NOT_FOUND || (status >= OK_MIN && status <= OK_MAX);
}

/** `fallback=404` is load-bearing: the default `monogram` answers 200 with a generic letter tile. */
export function logoDevUrl(domain: string, token: string): string {
    return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(token)}&size=512&format=png&fallback=404`;
}

export function faviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

async function fetchOnce(url: string, fetchImpl: typeof fetch): Promise<TierOutcome | "timeout"> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetchImpl(url, { signal: controller.signal });
        const bytes = new Uint8Array(await response.arrayBuffer());
        const verdict = isRealLogo(response.status, response.headers.get("content-type"), bytes);
        if (verdict.ok) {
            return { bytes, kind: "logo" };
        }
        return refused(response.status) ? REFUSED : INDETERMINATE;
    } catch {
        return controller.signal.aborted ? "timeout" : INDETERMINATE;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchAccepted(url: string, fetchImpl: typeof fetch): Promise<TierOutcome> {
    for (let attempt = 1; attempt <= TIMEOUT_ATTEMPTS; attempt += 1) {
        // oxlint-disable-next-line no-await-in-loop -- a retry only makes sense once the first attempt has timed out
        const outcome = await fetchOnce(url, fetchImpl);
        if (outcome !== "timeout") {
            return outcome;
        }
    }
    return INDETERMINATE;
}

export interface MerchantImageRequest {
    domain: string | null;
    name: string;
    refresh?: boolean;
}

export async function fetchMerchantImage(
    request: MerchantImageRequest,
    fetchImpl: typeof fetch = fetch
): Promise<LogoOutcome> {
    // Required lazily so importing this module does not pull expo-file-system into every consumer's graph.
    let cache: typeof import("@/lib/logo-cache") | null = null;
    try {
        // SAFETY: untyped `require`, asserted to that module's own type.
        cache = require("@/lib/logo-cache") as typeof import("@/lib/logo-cache");
    } catch {
        cache = null;
    }
    const key = cache?.logoCacheKey(request.name.trim(), request.domain) ?? "";
    const cached = (await cache?.readCachedLogo(key)) ?? {
        kind: "unknown" as const,
    };
    if (cached.kind === "logo") {
        return { bytes: cached.bytes, kind: "logo" };
    }
    if (cached.kind === "miss" && request.refresh !== true) {
        return NONE;
    }

    // Never cache a no-domain miss: enrichment calls this for partial spellings and the key is folded when the
    // call resolves, so a half-typed name could file a permanent miss under the finished one.
    if (request.domain == null || request.domain.length === 0) {
        return NONE;
    }
    const outcome = await resolveMerchantImage(request, fetchImpl);
    if (outcome.kind === "logo") {
        cache?.writeCachedLogo(key, outcome.bytes);
        return outcome;
    }
    if (outcome.definitive) {
        cache?.writeCachedLogo(key, null);
    }
    return NONE;
}

/** No App Store tier: Apple's Search API terms allow app icons only on pages promoting that store content. */
async function resolveMerchantImage(request: MerchantImageRequest, fetchImpl: typeof fetch): Promise<TierOutcome> {
    const { domain } = request;
    if (domain == null || domain.length === 0) {
        return INDETERMINATE;
    }

    let definitive = true;
    const token = env.EXPO_PUBLIC_LOGO_DEV_TOKEN;
    if (token) {
        const branded = await fetchAccepted(logoDevUrl(domain, token), fetchImpl);
        if (branded.kind === "logo") {
            return branded;
        }
        ({ definitive } = branded);
    }

    const favicon = await fetchAccepted(faviconUrl(domain), fetchImpl);
    if (favicon.kind === "logo") {
        return favicon;
    }
    return definitive && favicon.definitive ? REFUSED : INDETERMINATE;
}
