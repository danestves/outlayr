import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import type { Id } from "./_generated/id";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import {
    DatabaseReader,
    DatabaseWriter,
    MutationCtx,
    MutationRunner,
    QueryCtx,
    QueryRunner,
    Scheduler,
} from "./_generated/services";
import { WEBHOOKS_EFFECTIVE_AT_MS } from "./legal";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { sha256Hex } from "./lib/sha256Hex";
import { refuseWhileDeleting } from "./lib/syncGuards";
import { isoAt, queueEvent } from "./lib/webhookEvents";
import { endpointUrl, signatureHeader } from "./lib/webhooks";
import { isPro, requirePro } from "./revenuecat";
import spec, { MAX_ENDPOINTS, MAX_FAILURES, MAX_INBOX, MAX_SECRET_LENGTH, MIN_SECRET_LENGTH } from "./webhooks.spec";

const HINT_LENGTH = 4;
const DELIVERY_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000];

const refusals = {
    AccountDeleting: dieAsConvexError,
    ProRequired: dieAsConvexError,
    Unauthenticated: dieAsConvexError,
} as const;

const validSecret = (secret: string) => secret.length >= MIN_SECRET_LENGTH && secret.length <= MAX_SECRET_LENGTH;

const isOk = (status: number) => status >= 200 && status < 300;

const opened = Effect.fn("Webhooks.opened")(function* opened() {
    return (yield* Clock.currentTimeMillis) >= WEBHOOKS_EFFECTIVE_AT_MS;
});

const proUser = Effect.fn("Webhooks.proUser")(function* proUser() {
    const ctx = yield* MutationCtx;
    const userId = yield* requireUserId(ctx);
    yield* requirePro(ctx, userId);
    yield* refuseWhileDeleting(userId);
    return userId;
});

const userTokens = Effect.fn("Webhooks.userTokens")(function* userTokens(userId: string) {
    return yield* (yield* DatabaseReader)
        .table("webhookTokens")
        .index("by_userId", (q) => q.eq("userId", userId))
        .collect();
});

const userEndpoints = Effect.fn("Webhooks.userEndpoints")(function* userEndpoints(userId: string) {
    return yield* (yield* DatabaseReader)
        .table("webhookEndpoints")
        .index("by_userId", (q) => q.eq("userId", userId))
        .collect();
});

const ownEndpoint = Effect.fn("Webhooks.ownEndpoint")(function* ownEndpoint(
    userId: string,
    endpointId: Id<"webhookEndpoints">
) {
    const endpoint = yield* (yield* DatabaseReader)
        .table("webhookEndpoints")
        .get(endpointId)
        .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
    return endpoint?.userId === userId ? endpoint : null;
});

const webhookStatus = FunctionImpl.make(
    databaseSchema,
    spec,
    "status",
    Effect.fn("Webhooks.status")(
        function* status() {
            const userId = yield* requireUserId(yield* QueryCtx);
            const [token] = yield* userTokens(userId);
            const endpoints = yield* userEndpoints(userId);
            return {
                endpoints: endpoints.map(({ _id, createdAt, disabledAt, failures, lastDelivery, url }) => ({
                    _id,
                    createdAt,
                    disabledAt,
                    failures,
                    lastDelivery,
                    url,
                })),
                inbound:
                    token === undefined
                        ? null
                        : { createdAt: token.createdAt, hint: token.hint, lastUsedAt: token.lastUsedAt },
            };
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const setInboundToken = FunctionImpl.make(
    databaseSchema,
    spec,
    "setInboundToken",
    Effect.fn("Webhooks.setInboundToken")(
        function* setInboundToken({ token }) {
            const userId = yield* proUser();
            if (!validSecret(token) || !(yield* opened())) {
                return false;
            }
            const writer = yield* DatabaseWriter;
            for (const old of yield* userTokens(userId)) {
                yield* writer.table("webhookTokens").delete(old._id);
            }
            yield* writer.table("webhookTokens").insert({
                createdAt: yield* Clock.currentTimeMillis,
                hint: token.slice(-HINT_LENGTH),
                tokenHash: yield* sha256Hex(token),
                userId,
            });
            return true;
        },
        Effect.catchTags(refusals),
        Effect.orDie
    )
);

const revokeInboundToken = FunctionImpl.make(
    databaseSchema,
    spec,
    "revokeInboundToken",
    Effect.fn("Webhooks.revokeInboundToken")(
        function* revokeInboundToken() {
            const userId = yield* requireUserId(yield* MutationCtx);
            const writer = yield* DatabaseWriter;
            for (const old of yield* userTokens(userId)) {
                yield* writer.table("webhookTokens").delete(old._id);
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const addEndpoint = FunctionImpl.make(
    databaseSchema,
    spec,
    "addEndpoint",
    Effect.fn("Webhooks.addEndpoint")(
        function* addEndpoint(args) {
            const userId = yield* proUser();
            if (!(yield* opened())) {
                return { kind: "unavailable" as const };
            }
            const url = endpointUrl(args.url);
            if (Option.isNone(url)) {
                return { kind: "invalidUrl" as const };
            }
            if (!validSecret(args.secret)) {
                return { kind: "invalidSecret" as const };
            }
            if ((yield* userEndpoints(userId)).length >= MAX_ENDPOINTS) {
                return { kind: "tooMany" as const };
            }
            const endpointId = yield* (yield* DatabaseWriter).table("webhookEndpoints").insert({
                createdAt: yield* Clock.currentTimeMillis,
                failures: 0,
                secret: args.secret,
                url: url.value,
                userId,
            });
            return { endpointId, kind: "added" as const };
        },
        Effect.catchTags(refusals),
        Effect.orDie
    )
);

const removeEndpoint = FunctionImpl.make(
    databaseSchema,
    spec,
    "removeEndpoint",
    Effect.fn("Webhooks.removeEndpoint")(
        function* removeEndpoint({ endpointId }) {
            const userId = yield* requireUserId(yield* MutationCtx);
            const endpoint = yield* ownEndpoint(userId, endpointId);
            if (endpoint !== null) {
                const writer = yield* DatabaseWriter;
                const pending = yield* (yield* DatabaseReader)
                    .table("webhookDeliveries")
                    .index("by_endpointId", (q) => q.eq("endpointId", endpointId))
                    .collect();
                for (const delivery of pending) {
                    yield* writer.table("webhookDeliveries").delete(delivery._id);
                }
                yield* writer.table("webhookEndpoints").delete(endpointId);
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const setEndpointSecret = FunctionImpl.make(
    databaseSchema,
    spec,
    "setEndpointSecret",
    Effect.fn("Webhooks.setEndpointSecret")(
        function* setEndpointSecret({ endpointId, secret }) {
            const userId = yield* proUser();
            const endpoint = validSecret(secret) ? yield* ownEndpoint(userId, endpointId) : null;
            if (endpoint === null) {
                return false;
            }
            yield* (yield* DatabaseWriter).table("webhookEndpoints").patch(endpointId, { secret });
            return true;
        },
        Effect.catchTags(refusals),
        Effect.orDie
    )
);

const testEndpoint = FunctionImpl.make(
    databaseSchema,
    spec,
    "testEndpoint",
    Effect.fn("Webhooks.testEndpoint")(
        function* testEndpoint({ endpointId }) {
            const userId = yield* proUser();
            const endpoint = yield* ownEndpoint(userId, endpointId);
            if (endpoint === null) {
                return false;
            }
            const now = yield* Clock.currentTimeMillis;
            const live = { ...endpoint, disabledAt: undefined, failures: 0 };
            yield* (yield* DatabaseWriter)
                .table("webhookEndpoints")
                .patch(endpointId, { disabledAt: undefined, failures: 0 });
            yield* queueEvent([live], { createdAt: isoAt(now), data: {}, id: `evt_ping_${now}`, type: "ping" });
            return true;
        },
        Effect.catchTags(refusals),
        Effect.orDie
    )
);

const inbox = FunctionImpl.make(
    databaseSchema,
    spec,
    "inbox",
    Effect.fn("Webhooks.inbox")(
        function* inbox() {
            const ctx = yield* QueryCtx;
            const userId = yield* requireUserId(ctx);
            const rows = yield* (yield* DatabaseReader)
                .table("inboundWrites")
                .index("by_userId", (q) => q.eq("userId", userId))
                .take(MAX_INBOX);
            return rows.map(({ _id, receivedAt, write }) => ({ id: _id, receivedAt, write }));
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const ackInbox = FunctionImpl.make(
    databaseSchema,
    spec,
    "ackInbox",
    Effect.fn("Webhooks.ackInbox")(
        function* ackInbox({ ids }) {
            const userId = yield* requireUserId(yield* MutationCtx);
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            for (const id of ids) {
                const row = yield* reader
                    .table("inboundWrites")
                    .get(id)
                    .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
                if (row?.userId === userId) {
                    yield* writer.table("inboundWrites").delete(id);
                }
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const receive = FunctionImpl.make(
    databaseSchema,
    spec,
    "receive",
    Effect.fn("Webhooks.receive")(function* receive({ tokenHash, write }) {
        const reader = yield* DatabaseReader;
        const token = yield* reader
            .table("webhookTokens")
            .get("by_tokenHash", tokenHash)
            .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
        if (token === null) {
            return { kind: "unknownToken" as const };
        }
        const ctx = yield* MutationCtx;
        const deleting = yield* refuseWhileDeleting(token.userId).pipe(
            Effect.as(false),
            Effect.catchTags({ AccountDeleting: () => Effect.succeed(true) })
        );
        if (deleting || !(yield* opened()) || !(yield* isPro(ctx, token.userId))) {
            return { kind: "refused" as const };
        }
        const queued = yield* reader
            .table("inboundWrites")
            .index("by_userId", (q) => q.eq("userId", token.userId))
            .take(MAX_INBOX);
        if (queued.length >= MAX_INBOX) {
            return { kind: "full" as const };
        }
        const now = yield* Clock.currentTimeMillis;
        const writer = yield* DatabaseWriter;
        yield* writer.table("webhookTokens").patch(token._id, { lastUsedAt: now });
        const id = yield* writer.table("inboundWrites").insert({ receivedAt: now, userId: token.userId, write });
        return { id, kind: "queued" as const };
    }, Effect.orDie)
);

const delivery = FunctionImpl.make(
    databaseSchema,
    spec,
    "delivery",
    Effect.fn("Webhooks.delivery")(function* delivery({ deliveryId }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("webhookDeliveries")
            .get(deliveryId)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        const endpoint =
            row === null
                ? null
                : yield* reader
                      .table("webhookEndpoints")
                      .get(row.endpointId)
                      .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null || endpoint === null || endpoint.disabledAt !== undefined) {
            return null;
        }
        return {
            attempt: row.attempt,
            body: row.body,
            eventId: row.eventId,
            secret: endpoint.secret,
            type: row.type,
            url: endpoint.url,
        };
    }, Effect.orDie)
);

const settleDelivery = FunctionImpl.make(
    databaseSchema,
    spec,
    "settleDelivery",
    Effect.fn("Webhooks.settleDelivery")(function* settleDelivery({ deliveryId, status }) {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const row = yield* reader
            .table("webhookDeliveries")
            .get(deliveryId)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null) {
            return null;
        }
        const endpoint = yield* reader
            .table("webhookEndpoints")
            .get(row.endpointId)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (endpoint === null || endpoint.disabledAt !== undefined) {
            yield* writer.table("webhookDeliveries").delete(deliveryId);
            return null;
        }
        const now = yield* Clock.currentTimeMillis;
        const lastDelivery = { at: now, status };
        if (isOk(status)) {
            yield* writer.table("webhookEndpoints").patch(endpoint._id, { failures: 0, lastDelivery });
            yield* writer.table("webhookDeliveries").delete(deliveryId);
            return null;
        }
        const failures = endpoint.failures + 1;
        const disabled = failures >= MAX_FAILURES;
        yield* writer.table("webhookEndpoints").patch(endpoint._id, {
            ...(disabled && { disabledAt: now }),
            failures,
            lastDelivery,
        });
        const wait = RETRY_DELAYS_MS[row.attempt];
        if (disabled || wait === undefined) {
            yield* writer.table("webhookDeliveries").delete(deliveryId);
            return null;
        }
        yield* writer.table("webhookDeliveries").patch(deliveryId, { attempt: row.attempt + 1 });
        yield* (yield* Scheduler).runAfter(Duration.millis(wait), refs.internal.webhooks.deliver, { deliveryId });
        return null;
    }, Effect.orDie)
);

const post = (url: string, init: Parameters<typeof fetch>[1]) => fetch(url, init);

const deliver = FunctionImpl.make(
    databaseSchema,
    spec,
    "deliver",
    Effect.fn("Webhooks.deliver")(
        function* deliver({ deliveryId }) {
            const { runQuery } = yield* QueryRunner;
            const { runMutation } = yield* MutationRunner;
            const pending = yield* runQuery(refs.internal.webhooks.delivery, { deliveryId });
            if (pending === null) {
                yield* runMutation(refs.internal.webhooks.settleDelivery, { deliveryId, status: 0 });
                return null;
            }
            const nowSeconds = Math.floor((yield* Clock.currentTimeMillis) / 1000);
            const signature = yield* signatureHeader(pending.secret, nowSeconds, pending.body);
            const status = yield* Effect.tryPromise(async () => {
                const response = await post(pending.url, {
                    body: pending.body,
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Outlayr-Webhooks/1",
                        "Outlayr-Delivery": deliveryId,
                        "Outlayr-Event": pending.type,
                        "Outlayr-Event-Id": pending.eventId,
                        "Outlayr-Signature": signature,
                    },
                    method: "POST",
                    redirect: "manual",
                    signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
                });
                return response.status;
            }).pipe(Effect.catchCause(() => Effect.succeed(0)));
            yield* runMutation(refs.internal.webhooks.settleDelivery, { deliveryId, status });
            return null;
        },
        Effect.catchCause((cause) => Console.warn("[webhooks] delivery not settled", cause).pipe(Effect.as(null)))
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(webhookStatus),
    Layer.provide(setInboundToken),
    Layer.provide(revokeInboundToken),
    Layer.provide(addEndpoint),
    Layer.provide(removeEndpoint),
    Layer.provide(setEndpointSecret),
    Layer.provide(testEndpoint),
    Layer.provide(inbox),
    Layer.provide(ackInbox),
    Layer.provide(receive),
    Layer.provide(delivery),
    Layer.provide(settleDelivery),
    Layer.provide(deliver),
    GroupImpl.finalize
);
