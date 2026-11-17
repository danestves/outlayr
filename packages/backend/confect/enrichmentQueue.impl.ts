import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx } from "./_generated/services";
import { MAX_ACK_IDS, MAX_RESULTS, settled, work } from "./enrichmentQueue";
import spec from "./enrichmentQueue.spec";
import { optionalUserId, requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { insertJob, queueWork } from "./lib/queueJob";

const enqueue = FunctionImpl.make(
    databaseSchema,
    spec,
    "enqueue",
    Effect.fn("EnrichmentQueue.enqueue")(
        function* enqueue(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireUserId(ctx);
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
        return null;
    }, Effect.orDie)
);

const results = FunctionImpl.make(
    databaseSchema,
    spec,
    "results",
    Effect.fn("EnrichmentQueue.results")(function* results() {
        const ctx = yield* QueryCtx;
        const userId = yield* optionalUserId(ctx);
        if (userId === null) {
            return [];
        }
        const reader = yield* DatabaseReader;
        const jobs = yield* Effect.all(
            (["done", "failed"] as const).map((status) =>
                reader
                    .table("enrichmentJobs")
                    .index("by_user_and_status", (q) => q.eq("userId", userId).eq("status", status))
                    .take(MAX_RESULTS)
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
            const userId = yield* requireUserId(ctx);
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
