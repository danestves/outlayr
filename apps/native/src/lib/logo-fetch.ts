import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

import { isRealLogo } from "@/domain/logo-acceptance";

const MERCHANT_LOGOS_ORIGIN = "https://logos.tryoutlayr.com";
const REQUEST_TIMEOUT = Duration.seconds(6);
/** A cold TLS handshake can alone exceed the budget; the retry reuses the connection. */
const TIMEOUT_ATTEMPTS = 2;

export type LogoOutcome = { kind: "logo"; bytes: Uint8Array } | { kind: "none" };

const NONE: LogoOutcome = { kind: "none" };

type Fetched =
    | { etag: string | null; kind: "logo"; bytes: Uint8Array }
    | { kind: "unchanged" }
    /** A non-definitive "none" (timeout, rate limit, server error) must never be cached as a miss. */
    | { definitive: boolean; kind: "none" };

const INDETERMINATE: Fetched = { definitive: false, kind: "none" };
const REFUSED: Fetched = { definitive: true, kind: "none" };

const NOT_FOUND = 404;
const NOT_MODIFIED = 304;
const OK_MIN = 200;
const OK_MAX = 299;

/** A rejected 2xx counts: the host looked and served a placeholder. */
function refused(status: number): boolean {
    return status === NOT_FOUND || (status >= OK_MIN && status <= OK_MAX);
}

export function merchantLogoUrl(domain: string): string {
    return `${MERCHANT_LOGOS_ORIGIN}/merchants/${encodeURIComponent(domain)}`;
}

const LogoResponse = Schema.Struct({
    bytes: Schema.Uint8Array,
    contentType: Schema.NullOr(Schema.String),
    status: Schema.Int,
});
const decodeLogoResponse = Schema.decodeUnknownEffect(LogoResponse);

const fetchOnce = Effect.fn("LogoFetch.fetchOnce")(function* fetchOnce(url: string, etag: string | null) {
    const response = yield* HttpClient.execute(
        etag === null
            ? HttpClientRequest.get(url)
            : HttpClientRequest.get(url).pipe(HttpClientRequest.setHeader("if-none-match", etag))
    );
    if (response.status === NOT_MODIFIED) {
        const unchanged: Fetched = { kind: "unchanged" };
        return unchanged;
    }
    const { bytes, contentType, status } = yield* decodeLogoResponse({
        bytes: new Uint8Array(yield* response.arrayBuffer),
        contentType: response.headers["content-type"] ?? null,
        status: response.status,
    });
    const verdict = isRealLogo(status, contentType, bytes);
    if (verdict.ok) {
        const logo: Fetched = { bytes, etag: response.headers.etag ?? null, kind: "logo" };
        return logo;
    }
    return refused(status) ? REFUSED : INDETERMINATE;
});

const fetchLogo = (domain: string, etag: string | null) =>
    fetchOnce(merchantLogoUrl(domain), etag).pipe(
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

export const fetchMerchantImage = Effect.fn("LogoFetch.fetchMerchantImage")(function* fetchMerchantImage(
    request: MerchantImageRequest
) {
    // Required lazily so importing this module does not pull expo-file-system into every consumer's graph.
    const cache = yield* Effect.tryPromise(() => import("@/lib/logo-cache")).pipe(Effect.orElseSucceed(() => null));
    const key = cache?.logoCacheKey(request.name.trim(), request.domain) ?? "";
    const { domain } = request;
    const cached = cache === null ? { kind: "unknown" as const } : yield* cache.readCachedLogo(key);
    if (cached.kind === "logo") {
        const stale = domain == null || domain.length === 0 ? null : (cache?.staleLogo(key) ?? null);
        if (stale !== null && domain != null) {
            yield* Effect.forkDetach(
                fetchLogo(domain, stale.etag).pipe(
                    Effect.tap((fresh) =>
                        Effect.sync(() => {
                            if (fresh.kind === "logo") {
                                cache?.writeCachedLogo(key, fresh.bytes, fresh.etag);
                            } else if (fresh.kind === "unchanged") {
                                cache?.writeCachedLogo(key, cached.bytes, stale.etag);
                            }
                        })
                    )
                )
            );
        }
        return { bytes: cached.bytes, kind: "logo" } satisfies LogoOutcome;
    }
    if (cached.kind === "miss" && request.refresh !== true) {
        return NONE;
    }

    // Never cache a no-domain miss: enrichment calls this for partial spellings and the key is folded when the
    // call resolves, so a half-typed name could file a permanent miss under the finished one.
    if (domain == null || domain.length === 0) {
        return NONE;
    }
    const outcome = yield* fetchLogo(domain, null);
    if (outcome.kind === "logo") {
        cache?.writeCachedLogo(key, outcome.bytes, outcome.etag);
        return { bytes: outcome.bytes, kind: "logo" } satisfies LogoOutcome;
    }
    if (outcome.kind === "none" && outcome.definitive) {
        cache?.writeCachedLogo(key, null);
    }
    return NONE;
});
