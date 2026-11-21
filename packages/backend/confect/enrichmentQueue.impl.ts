import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx, Scheduler } from "./_generated/services";
import { MAX_ACK_IDS, MAX_RESULTS, settled, work } from "./enrichmentQueue";
import spec from "./enrichmentQueue.spec";
import { optionalBillingId, requireBillingId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { insertJob, queueWork } from "./lib/queueJob";

const enqueue = FunctionImpl.make(
    databaseSchema,
    spec,
    "enqueue",
    Effect.fn("EnrichmentQueue.enqueue")(
        function* enqueue(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireBillingId(ctx);
            const jobId = yield* insertJob(userId, args);
            if (jobId === null) {
                return false;
            }
            yield* queueWork(ctx, jobId);
            return true;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const job = FunctionImpl.make(
    databaseSchema,
    spec,
    "job",
    Effect.fn("EnrichmentQueue.job")(function* job(args) {
        const reader = yield* DatabaseReader;
        return yield* reader
            .table("enrichmentJobs")
            .get(args.jobId)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
    }, Effect.orDie)
);

const finish = FunctionImpl.make(
    databaseSchema,
    spec,
    "finish",
    Effect.fn("EnrichmentQueue.finish")(function* finish(args) {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const row = yield* reader
            .table("enrichmentJobs")
            .get(args.jobId)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null) {
            return null;
        }
        yield* writer
            .table("enrichmentJobs")
            .patch(args.jobId, args.result === null ? { status: "failed" } : { result: args.result, status: "done" });
        const named = args.result !== null && (args.result.merchantName ?? args.result.categoryName) !== null;
        if (named && row.deviceId !== undefined) {
            yield* (yield* Scheduler).runAfter(Duration.zero, refs.internal.captureLookup.push, {
                captureId: row.localId,
                deviceId: row.deviceId,
                locale: row.locale,
                name: row.name,
                result: args.result,
                userId: row.userId,
            });
        }
        return null;
    }, Effect.orDie)
);

const results = FunctionImpl.make(
    databaseSchema,
    spec,
    "results",
    Effect.fn("EnrichmentQueue.results")(function* results(args) {
        const ctx = yield* QueryCtx;
        const userId = yield* optionalBillingId(ctx);
        if (userId === null) {
            return [];
        }
        const reader = yield* DatabaseReader;
        const devices = args.deviceId === undefined ? [undefined] : [undefined, args.deviceId];
        const jobs = yield* Effect.all(
            devices.flatMap((deviceId) =>
                (["done", "failed"] as const).map((status) =>
                    reader
                        .table("enrichmentJobs")
                        .index("by_user_device_and_status", (q) =>
                            q.eq("userId", userId).eq("deviceId", deviceId).eq("status", status)
                        )
                        .take(MAX_RESULTS)
                )
            ),
            { concurrency: "unbounded" }
        );
        return jobs.flat().map((row) => ({
            localId: row.localId,
            name: row.name,
            result: row.result ?? null,
        }));
    }, Effect.orDie)
);

const ack = FunctionImpl.make(
    databaseSchema,
    spec,
    "ack",
    Effect.fn("EnrichmentQueue.ack")(
        function* ack(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireBillingId(ctx);
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            for (const localId of args.localIds.slice(0, MAX_ACK_IDS)) {
                const row = yield* reader
                    .table("enrichmentJobs")
                    .get("by_user_and_localId", userId, localId)
                    .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
                if (row !== null && row.status !== "queued") {
                    yield* writer.table("enrichmentJobs").delete(row._id);
                }
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(enqueue),
    Layer.provide(job),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "work", work)),
    Layer.provide(finish),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "settled", settled)),
    Layer.provide(results),
    Layer.provide(ack),
    GroupImpl.finalize
);
