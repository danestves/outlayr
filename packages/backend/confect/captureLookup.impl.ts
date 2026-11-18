import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx } from "./_generated/services";
import spec, { MAX_ID_LENGTH, MAX_KEY_LENGTH, MIN_KEY_LENGTH } from "./captureLookup.spec";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { insertJob, queueWork } from "./lib/queueJob";
import { sha256Hex } from "./lib/sha256Hex";

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
            const userId = yield* requireUserId(ctx);
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
            const userId = yield* requireUserId(ctx);
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

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(register),
    Layer.provide(revoke),
    Layer.provide(open),
    Layer.provide(settle),
    GroupImpl.finalize
);
