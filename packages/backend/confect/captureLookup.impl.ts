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
import spec, { MAX_ID_LENGTH, MAX_KEY_LENGTH, MIN_KEY_LENGTH } from "./captureLookup.spec";
import { CAPTURE_PUSH_EFFECTIVE_AT_MS } from "./legal";
import { requireBillingId } from "./lib/auth";
import { capturePushRequest, DEVICE_TOKEN, isDeadToken, PUSH_SECRET, rejectionReason } from "./lib/capturePush";
import { apnsConfig } from "./lib/config";
import { dieAsConvexError } from "./lib/convexError";
import { insertJob, queueWork } from "./lib/queueJob";
import { sha256Hex } from "./lib/sha256Hex";

// Nothing about a push is stored or sent before the privacy notice that announces it takes effect.
const pushLive = Effect.fn("CaptureLookup.pushLive")(function* pushLive() {
    const config = yield* apnsConfig;
    const now = yield* Clock.currentTimeMillis;
    return now >= CAPTURE_PUSH_EFFECTIVE_AT_MS ? config : Option.none();
});

const deviceKey = Effect.fn("CaptureLookup.deviceKey")(function* deviceKey(userId: string, deviceId: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("captureKeys")
        .get("by_user_and_device", userId, deviceId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const register = FunctionImpl.make(
    databaseSchema,
    spec,
    "register",
    Effect.fn("CaptureLookup.register")(
        function* register(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireBillingId(ctx);
            const tooShort = args.key.length < MIN_KEY_LENGTH;
            if (tooShort || args.key.length > MAX_KEY_LENGTH || args.deviceId.length > MAX_ID_LENGTH) {
                return false;
            }
            const writer = yield* DatabaseWriter;
            const existing = yield* deviceKey(userId, args.deviceId);
            if (existing !== null) {
                yield* writer.table("captureKeys").delete(existing._id);
            }
            const keyHash = yield* sha256Hex(args.key);
            yield* writer.table("captureKeys").insert({ deviceId: args.deviceId, keyHash, userId });
            return true;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const revoke = FunctionImpl.make(
    databaseSchema,
    spec,
    "revoke",
    Effect.fn("CaptureLookup.revoke")(
        function* revoke(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireBillingId(ctx);
            const existing = yield* deviceKey(userId, args.deviceId);
            if (existing !== null) {
                const writer = yield* DatabaseWriter;
                yield* writer.table("captureKeys").delete(existing._id);
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const open = FunctionImpl.make(
    databaseSchema,
    spec,
    "open",
    Effect.fn("CaptureLookup.open")(function* open({ captureId, keyHash, ...args }) {
        const reader = yield* DatabaseReader;
        const owner = yield* reader
            .table("captureKeys")
            .get("by_keyHash", keyHash)
            .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
        if (owner === null) {
            return { kind: "unknownKey" as const };
        }
        const jobId =
            captureId.length === 0 || captureId.length > MAX_ID_LENGTH
                ? null
                : yield* insertJob(owner.userId, { ...args, deviceId: owner.deviceId, localId: captureId });
        const job =
            jobId === null
                ? null
                : yield* reader
                      .table("enrichmentJobs")
                      .get(jobId)
                      .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        return job === null ? { kind: "refused" as const } : { job, kind: "open" as const };
    }, Effect.orDie)
);

const settle = FunctionImpl.make(
    databaseSchema,
    spec,
    "settle",
    Effect.fn("CaptureLookup.settle")(function* settle(args) {
        if (args.final && args.result !== null) {
            const writer = yield* DatabaseWriter;
            yield* writer.table("enrichmentJobs").patch(args.jobId, { result: args.result, status: "done" });
            return null;
        }
        const ctx = yield* MutationCtx;
        yield* queueWork(ctx, args.jobId);
        return null;
    }, Effect.orDie)
);

const setPush = FunctionImpl.make(
    databaseSchema,
    spec,
    "setPush",
    Effect.fn("CaptureLookup.setPush")(
        function* setPush({ deviceId, ...push }) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireBillingId(ctx);
            const valid = PUSH_SECRET.test(push.secret) && DEVICE_TOKEN.test(push.token);
            const existing = valid && Option.isSome(yield* pushLive()) ? yield* deviceKey(userId, deviceId) : null;
            if (existing === null) {
                return false;
            }
            yield* (yield* DatabaseWriter).table("captureKeys").patch(existing._id, { push });
            return true;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const pushTarget = FunctionImpl.make(
    databaseSchema,
    spec,
    "pushTarget",
    Effect.fn("CaptureLookup.pushTarget")(function* pushTarget({ deviceId, userId }) {
        return (yield* deviceKey(userId, deviceId))?.push ?? null;
    }, Effect.orDie)
);

const dropPush = FunctionImpl.make(
    databaseSchema,
    spec,
    "dropPush",
    Effect.fn("CaptureLookup.dropPush")(function* dropPush({ deviceId, token, userId }) {
        const existing = yield* deviceKey(userId, deviceId);
        if (existing?.push?.token === token) {
            yield* (yield* DatabaseWriter).table("captureKeys").patch(existing._id, { push: undefined });
        }
        return null;
    }, Effect.orDie)
);

const push = FunctionImpl.make(
    databaseSchema,
    spec,
    "push",
    Effect.fn("CaptureLookup.push")(
        function* push({ deviceId, userId, ...answer }) {
            const credentials = yield* pushLive();
            if (Option.isNone(credentials)) {
                return null;
            }
            const { runQuery } = yield* QueryRunner;
            const target = yield* runQuery(refs.internal.captureLookup.pushTarget, { deviceId, userId });
            if (target === null) {
                return null;
            }
            const nowSeconds = Math.floor((yield* Clock.currentTimeMillis) / 1000);
            const { reason, status } = yield* Effect.tryPromise(async () => {
                const { init, url } = await capturePushRequest(
                    { ...credentials.value, privateKey: Redacted.value(credentials.value.privateKey) },
                    target,
                    answer,
                    nowSeconds
                );
                const response = await fetch(url, init);
                return {
                    reason: response.ok ? undefined : rejectionReason(await response.text()),
                    status: response.status,
                };
            });
            if (isDeadToken(status, reason)) {
                const { runMutation } = yield* MutationRunner;
                yield* runMutation(refs.internal.captureLookup.dropPush, { deviceId, token: target.token, userId });
            } else if (status !== 200) {
                yield* Console.warn(`[capture] push refused: ${status} ${reason ?? ""}`);
            }
            return null;
        },
        Effect.catchCause((cause) => Console.warn("[capture] push not sent", cause).pipe(Effect.as(null)))
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(register),
    Layer.provide(revoke),
    Layer.provide(open),
    Layer.provide(settle),
    Layer.provide(setPush),
    Layer.provide(pushTarget),
    Layer.provide(dropPush),
    Layer.provide(push),
    GroupImpl.finalize
);
