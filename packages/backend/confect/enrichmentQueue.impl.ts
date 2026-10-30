import { FunctionImpl, GroupImpl } from "@confect/server";
import type { WorkId } from "@convex-dev/workpool";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { internal } from "../convex/_generated/api";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { Auth, DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx, QueryRunner } from "./_generated/services";
import { MAX_NAME_LENGTH, rateLimiter, sanitizeCurrencyCode, sanitizeLocale, sanitizeRegionCode } from "./enrichment";
import { MAX_ACK_IDS, MAX_RESULTS, MIN_NAME_LENGTH, pool, settled, work } from "./enrichmentQueue";
import spec from "./enrichmentQueue.spec";
import { optionalUserId, requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { isPro } from "./revenuecat";

const enqueue = FunctionImpl.make(
    databaseSchema,
    spec,
    "enqueue",
    Effect.fn("EnrichmentQueue.enqueue")(
        function* enqueue(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireUserId(ctx);
            const name = args.name.trim();
            if (
                args.aiConsent !== AI_CONSENT_VERSION ||
                name.length < MIN_NAME_LENGTH ||
                name.length > MAX_NAME_LENGTH
            ) {
                return false;
            }
            const gate = yield* Effect.promise(() => rateLimiter.limit(ctx, "enrichmentQueue", { key: userId }));
            if (!gate.ok) {
                return false;
            }
            const auth = yield* Auth;
            const identity = yield* auth.getUserIdentity.pipe(
                Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
            );
            const { runQuery } = yield* QueryRunner;
            const grounded =
                args.groundedLookup &&
                identity !== null &&
                (yield* runQuery(refs.internal.enrichment.groundedConsent)) &&
                (yield* isPro(ctx, identity.subject));
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const existing = yield* reader
                .table("enrichmentJobs")
                .get("by_user_and_localId", userId, args.localId)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
            if (existing !== null) {
                yield* writer.table("enrichmentJobs").delete(existing._id);
            }
            const jobId = yield* writer.table("enrichmentJobs").insert({
                categoryTree: args.categoryTree,
                currency: sanitizeCurrencyCode(args.currency),
                grounded,
                income: args.income,
                localId: args.localId,
                locale: sanitizeLocale(args.locale),
                name,
                regionCode: sanitizeRegionCode(args.regionCode),
                shareAnalytics: args.shareAnalytics,
                status: "queued",
                userId,
            });
            yield* Effect.promise((): Promise<WorkId> =>
                pool.enqueueAction(
                    ctx,
                    internal.enrichmentQueue.work,
                    { jobId },
                    {
                        context: { jobId },
                        onComplete: internal.enrichmentQueue.settled,
                        onCompleteExcludeKinds: ["success"],
                    }
                )
            );
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
        const [done, failed] = yield* Effect.all(
            (["done", "failed"] as const).map((status) =>
                reader
                    .table("enrichmentJobs")
                    .index("by_user_and_status", (q) => q.eq("userId", userId).eq("status", status))
                    .take(MAX_RESULTS)
            ),
            { concurrency: "unbounded" }
        );
        return [...done, ...failed].map((row) => ({
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
