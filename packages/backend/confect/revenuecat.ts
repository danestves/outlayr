import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { RevenueCat } from "convex-revenuecat";
import type * as Cause from "effect/Cause";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import type { HttpClientError } from "effect/http/HttpClientError";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import { revenueCatSecretKey } from "./lib/config";

export const PRO_ENTITLEMENT_ID = "pro";

const REVENUECAT_TIMEOUT = Duration.seconds(10);
const SUBSCRIBERS_URL = "https://api.revenuecat.com/v1/subscribers";

export const revenuecat = new RevenueCat(components.revenuecat);

export class ProRequired extends Schema.TaggedError<ProRequired>()("ProRequired", {
    message: Schema.String.pipe(Schema.withConstructorDefault(Effect.succeed("Outlayr Pro is required for this"))),
}) {}

export class RevenueCatError extends Schema.TaggedError<RevenueCatError>()("RevenueCatError", {
    cause: Schema.optional(Schema.Defect()),
    operation: Schema.Literals(["eraseCustomer", "readSubscriber"]),
    reason: Schema.Literals(["unconfigured", "status", "transport"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.reason === "unconfigured") {
            return "REVENUECAT_SECRET_KEY is not set; the upstream customer cannot be erased";
        }
        if (this.reason === "status") {
            return `RevenueCat customer erase failed with ${this.status}`;
        }
        return `RevenueCat request failed during ${this.operation}`;
    }
}

export const isPro = Effect.fn("RevenueCat.isPro")(function* isPro(
    ctx: Parameters<typeof revenuecat.hasEntitlement>[0],
    userId: string
) {
    return yield* Effect.promise(() =>
        revenuecat.hasEntitlement(ctx, { appUserId: userId, entitlementId: PRO_ENTITLEMENT_ID })
    );
});

export const requirePro = Effect.fn("RevenueCat.requirePro")(function* requirePro(
    ctx: Parameters<typeof isPro>[0],
    userId: string
) {
    if (!(yield* isPro(ctx, userId))) {
        return yield* new ProRequired();
    }
});

const subscriberUrl = (appUserId: string) => `${SUBSCRIBERS_URL}/${encodeURIComponent(appUserId)}`;

const isOk = (status: number) => status >= 200 && status < 300;

export const eraseUpstreamCustomer = Effect.fn("RevenueCat.eraseUpstreamCustomer")(function* eraseUpstreamCustomer(
    appUserId: string
) {
    const secretKey = yield* revenueCatSecretKey;
    if (Option.isNone(secretKey)) {
        return yield* new RevenueCatError({ operation: "eraseCustomer", reason: "unconfigured" });
    }
    const response = yield* HttpClient.execute(
        HttpClientRequest.delete(subscriberUrl(appUserId)).pipe(HttpClientRequest.bearerToken(secretKey.value))
    ).pipe(
        Effect.timeout(REVENUECAT_TIMEOUT),
        Effect.catchTags({
            HttpClientError: (cause) => new RevenueCatError({ cause, operation: "eraseCustomer", reason: "transport" }),
            TimeoutError: (cause) => new RevenueCatError({ cause, operation: "eraseCustomer", reason: "transport" }),
        })
    );
    if (!isOk(response.status) && response.status !== 404) {
        return yield* new RevenueCatError({ operation: "eraseCustomer", reason: "status", status: response.status });
    }
});

const SubscriberResponse = Schema.Struct({ subscriber: Schema.Record(Schema.String, Schema.Unknown) });

const decodeSubscriberResponse = HttpIncomingMessage.schemaBodyJson(SubscriberResponse);

/** Whether an authoritative payload still lists Pro at all, expired or not. */
export const listsPro = Schema.is(
    Schema.Struct({
        entitlements: Schema.Struct({ [PRO_ENTITLEMENT_ID]: Schema.Record(Schema.String, Schema.Unknown) }),
    })
);

export const syncLimiter = new RateLimiter(components.rateLimiter, {
    revenuecatSync: { capacity: 12, kind: "token bucket", period: HOUR, rate: 12 },
});

const subscriberUnread = (error: HttpClientError | Cause.TimeoutError) =>
    Console.warn("[revenuecat] subscriber read failed", error).pipe(Effect.as(null));

// A thrown fetch or decode means the store did not answer, like a non-2xx; only those two are caught here.
export const storeSubscriber = Effect.fn("RevenueCat.storeSubscriber")(function* storeSubscriber(appUserId: string) {
    const secretKey = yield* revenueCatSecretKey;
    if (Option.isNone(secretKey)) {
        return null;
    }
    return yield* HttpClient.execute(
        HttpClientRequest.get(subscriberUrl(appUserId)).pipe(HttpClientRequest.bearerToken(secretKey.value))
    ).pipe(
        Effect.flatMap((response) =>
            isOk(response.status)
                ? decodeSubscriberResponse(response).pipe(Effect.map(({ subscriber }) => subscriber))
                : Effect.succeed(null)
        ),
        Effect.timeout(REVENUECAT_TIMEOUT),
        Effect.catchTags({
            HttpClientError: subscriberUnread,
            SchemaError: () => Effect.succeed(null),
            TimeoutError: subscriberUnread,
        })
    );
});
