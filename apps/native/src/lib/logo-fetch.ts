import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

import { isRealLogo } from "@/domain/logo-acceptance";
import { ENV } from "@/env";

const REQUEST_TIMEOUT = Duration.seconds(3);
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

const LogoResponse = Schema.Struct({
    bytes: Schema.Uint8Array,
    contentType: Schema.NullOr(Schema.String),
    status: Schema.Int,
});
const decodeLogoResponse = Schema.decodeUnknownEffect(LogoResponse);

const fetchOnce = Effect.fn("LogoFetch.fetchOnce")(function* fetchOnce(url: string) {
    const response = yield* HttpClient.get(url);
    const { bytes, contentType, status } = yield* decodeLogoResponse({
        bytes: new Uint8Array(yield* response.arrayBuffer),
        contentType: response.headers["content-type"] ?? null,
        status: response.status,
    });
    const verdict = isRealLogo(status, contentType, bytes);
    if (verdict.ok) {
        const logo: TierOutcome = { bytes, kind: "logo" };
        return logo;
    }
    return refused(status) ? REFUSED : INDETERMINATE;
});

const fetchAccepted = (url: string) =>
    fetchOnce(url).pipe(
        Effect.timeout(REQUEST_TIMEOUT),
        Effect.retry({ schedule: Schedule.recurs(TIMEOUT_ATTEMPTS - 1), while: Cause.isTimeoutError }),
        Effect.catchTags({
            HttpClientError: () => Effect.succeed(INDETERMINATE),
            SchemaError: () => Effect.succeed(INDETERMINATE),
            TimeoutError: () => Effect.succeed(INDETERMINATE),
        })
    );

export interface MerchantImageRequest {
    domain: string | null;
    name: string;
    refresh?: boolean;
}

/** No App Store tier: Apple's Search API terms allow app icons only on pages promoting that store content. */
const resolveMerchantImage = Effect.fn("LogoFetch.resolveMerchantImage")(function* resolveMerchantImage(
    request: MerchantImageRequest
) {
    const { domain } = request;
    if (domain == null || domain.length === 0) {
        return INDETERMINATE;
    }

    let definitive = true;
    const token = ENV.EXPO_PUBLIC_LOGO_DEV_TOKEN;
    if (token) {
        const branded = yield* fetchAccepted(logoDevUrl(domain, token));
        if (branded.kind === "logo") {
            return branded;
        }
        ({ definitive } = branded);
    }

    const favicon = yield* fetchAccepted(faviconUrl(domain));
    if (favicon.kind === "logo") {
        return favicon;
    }
    return definitive && favicon.definitive ? REFUSED : INDETERMINATE;
});

export const fetchMerchantImage = Effect.fn("LogoFetch.fetchMerchantImage")(function* fetchMerchantImage(
    request: MerchantImageRequest
) {
    // Required lazily so importing this module does not pull expo-file-system into every consumer's graph.
    let cache: typeof import("@/lib/logo-cache") | null = null;
    try {
        // SAFETY: untyped `require`, asserted to that module's own type.
        cache = require("@/lib/logo-cache") as typeof import("@/lib/logo-cache");
    } catch {
        cache = null;
    }
    const key = cache?.logoCacheKey(request.name.trim(), request.domain) ?? "";
    const cached = cache === null ? { kind: "unknown" as const } : yield* cache.readCachedLogo(key);
    if (cached.kind === "logo") {
        return { bytes: cached.bytes, kind: "logo" } satisfies LogoOutcome;
    }
    if (cached.kind === "miss" && request.refresh !== true) {
        return NONE;
    }

    // Never cache a no-domain miss: enrichment calls this for partial spellings and the key is folded when the
    // call resolves, so a half-typed name could file a permanent miss under the finished one.
    if (request.domain == null || request.domain.length === 0) {
        return NONE;
    }
    const outcome = yield* resolveMerchantImage(request);
    if (outcome.kind === "logo") {
        cache?.writeCachedLogo(key, outcome.bytes);
        return outcome satisfies LogoOutcome;
    }
    if (outcome.definitive) {
        cache?.writeCachedLogo(key, null);
    }
    return NONE;
});
