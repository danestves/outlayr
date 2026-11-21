import type { WorkId } from "@convex-dev/workpool";
import * as Effect from "effect/Effect";

import { internal } from "../../convex/_generated/api";
import type { MutationCtx as ConvexMutationCtx } from "../../convex/_generated/server";
import type { Id } from "../_generated/id";
import { DatabaseReader, DatabaseWriter, MutationCtx } from "../_generated/services";
import {
    GROUNDED_LOOKUP_META_KEY,
    MAX_NAME_LENGTH,
    rateLimiter,
    sanitizeCurrencyCode,
    sanitizeLocale,
    sanitizeRegionCode,
} from "../enrichment";
import { MIN_NAME_LENGTH, pool } from "../enrichmentQueue";
import { isPro } from "../revenuecat";
import { hasAiConsent } from "./aiGate";
import { authComponent } from "./betterAuth";

export interface JobArgs {
    readonly aiConsent?: number | undefined;
    readonly categoryTree: readonly { readonly children: readonly string[]; readonly name: string }[];
    readonly currency?: string | undefined;
    readonly deviceId?: string | undefined;
    readonly groundedLookup: boolean;
    readonly income: boolean;
    readonly localId: string;
    readonly locale?: string | undefined;
    readonly name: string;
    readonly regionCode?: string | undefined;
    readonly shareAnalytics?: boolean | undefined;
}

// Null is a refusal (consent, name length, a guest without Pro or the per-user limit); a job already keyed by
// `localId` is replaced.
export const insertJob = Effect.fn("EnrichmentQueue.insertJob")(function* insertJob(userId: string, args: JobArgs) {
    const ctx = yield* MutationCtx;
    const name = args.name.trim();
    if (!hasAiConsent(args) || name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
        return null;
    }
    const [user, pro] = yield* Effect.all([
        Effect.promise(() => authComponent.getAnyUserById(ctx, userId)),
        isPro(ctx, userId),
    ]);
    if (user?.isAnonymous === true && !pro) {
        return null;
    }
    const gate = yield* Effect.promise(() => rateLimiter.limit(ctx, "enrichmentQueue", { key: userId }));
    if (!gate.ok) {
        return null;
    }
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const groundedOff = yield* reader
        .table("appMeta")
        .get("by_user_and_key", userId, GROUNDED_LOOKUP_META_KEY)
        .pipe(
            Effect.map((row) => row.value === "false"),
            Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(false) })
        );
    const grounded = args.groundedLookup && !groundedOff && pro;
    const existing = yield* reader
        .table("enrichmentJobs")
        .get("by_user_and_localId", userId, args.localId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    if (existing !== null) {
        yield* writer.table("enrichmentJobs").delete(existing._id);
    }
    return yield* writer.table("enrichmentJobs").insert({
        categoryTree: args.categoryTree,
        currency: sanitizeCurrencyCode(args.currency),
        deviceId: args.deviceId,
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
});

export const queueWork = (ctx: ConvexMutationCtx, jobId: Id<"enrichmentJobs">) =>
    Effect.promise((): Promise<WorkId> =>
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
