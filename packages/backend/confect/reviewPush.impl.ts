import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx, MutationRunner, QueryRunner } from "./_generated/services";
import { MAX_ID_LENGTH } from "./captureLookup.spec";
import { requireBillingId } from "./lib/auth";
import { DEVICE_TOKEN, isDeadToken, rejectionReason } from "./lib/capturePush";
import { apnsConfig } from "./lib/config";
import { dieAsConvexError } from "./lib/convexError";
import { reviewPushRequest } from "./lib/reviewPush";
import { refuseWhileDeleting } from "./lib/syncGuards";
import spec from "./reviewPush.spec";

// Convex actions have no HttpClient layer, so the runtime's own fetch is the transport.
const sendPush = (url: string, init: Parameters<typeof fetch>[1]) => fetch(url, init);
// One stalled APNs call must not use up the action before the remaining phones are tried.
const APNS_TIMEOUT_MS = 10_000;

const targetFor = Effect.fn("ReviewPush.targetFor")(function* targetFor(userId: string, deviceId: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("reviewPushTargets")
        .get("by_user_and_device", userId, deviceId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const setTarget = FunctionImpl.make(
    databaseSchema,
    spec,
    "setTarget",
    Effect.fn("ReviewPush.setTarget")(
        function* setTarget({ deviceId, ...target }) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireBillingId(ctx);
            if (!DEVICE_TOKEN.test(target.token) || deviceId.length > MAX_ID_LENGTH) {
                return false;
            }
            // The purge already ran, so a target set now would outlive the account.
            const deleting = yield* refuseWhileDeleting(userId).pipe(
                Effect.as(false),
                Effect.catchTags({ AccountDeleting: () => Effect.succeed(true) })
            );
            if (deleting) {
                return false;
            }
            const existing = yield* targetFor(userId, deviceId);
            const writer = yield* DatabaseWriter;
            yield* existing === null
                ? writer.table("reviewPushTargets").insert({ ...target, deviceId, userId })
                : writer.table("reviewPushTargets").patch(existing._id, target);
            return true;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const clearTarget = FunctionImpl.make(
    databaseSchema,
    spec,
    "clearTarget",
    Effect.fn("ReviewPush.clearTarget")(
        function* clearTarget({ deviceId }) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireBillingId(ctx);
            const existing = yield* targetFor(userId, deviceId);
            if (existing !== null) {
                yield* (yield* DatabaseWriter).table("reviewPushTargets").delete(existing._id);
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const targets = FunctionImpl.make(
    databaseSchema,
    spec,
    "targets",
    Effect.fn("ReviewPush.targets")(function* targets({ ids }) {
        const reader = yield* DatabaseReader;
        const rows = yield* Effect.all(
            ids.map((id) =>
                reader
                    .table("reviewPushTargets")
                    .get(id)
                    .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }))
            ),
            { concurrency: "unbounded" }
        );
        return rows.filter((row) => row !== null);
    }, Effect.orDie)
);

const dropTarget = FunctionImpl.make(
    databaseSchema,
    spec,
    "dropTarget",
    Effect.fn("ReviewPush.dropTarget")(function* dropTarget({ id, token }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("reviewPushTargets")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row?.token === token) {
            yield* (yield* DatabaseWriter).table("reviewPushTargets").delete(row._id);
        }
        return null;
    }, Effect.orDie)
);

const deliver = FunctionImpl.make(
    databaseSchema,
    spec,
    "deliver",
    Effect.fn("ReviewPush.deliver")(
        function* deliver({ count, ids, language }) {
            const credentials = yield* apnsConfig;
            if (ids.length === 0 || Option.isNone(credentials)) {
                return null;
            }
            const { runQuery } = yield* QueryRunner;
            const rows = yield* runQuery(refs.internal.reviewPush.targets, { ids });
            const nowSeconds = Math.floor((yield* Clock.currentTimeMillis) / 1000);
            const privateKey = Redacted.value(credentials.value.privateKey);
            for (const target of rows) {
                const sent = yield* Effect.tryPromise(async (signal) => {
                    const { init, url } = await reviewPushRequest(
                        { ...credentials.value, privateKey },
                        target,
                        count,
                        language,
                        nowSeconds
                    );
                    const response = await sendPush(url, { ...init, signal });
                    return {
                        reason: response.ok ? undefined : rejectionReason(await response.text()),
                        status: response.status,
                    };
                }).pipe(
                    Effect.timeout(APNS_TIMEOUT_MS),
                    Effect.catchCause((cause) => Console.warn("[review] push not sent", cause).pipe(Effect.as(null)))
                );
                if (sent === null) {
                    continue;
                }
                if (isDeadToken(sent.status, sent.reason)) {
                    const { runMutation } = yield* MutationRunner;
                    yield* runMutation(refs.internal.reviewPush.dropTarget, {
                        id: target._id,
                        token: target.token,
                    });
                } else if (sent.status !== 200) {
                    yield* Console.warn(`[review] push refused: ${sent.status} ${sent.reason ?? ""}`);
                }
            }
            return null;
        },
        Effect.catchCause((cause) => Console.warn("[review] delivery skipped", cause).pipe(Effect.as(null)))
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(setTarget),
    Layer.provide(clearTarget),
    Layer.provide(targets),
    Layer.provide(dropTarget),
    Layer.provide(deliver),
    GroupImpl.finalize
);
