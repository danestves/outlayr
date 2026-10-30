import { createAnthropic } from "@ai-sdk/anthropic";
import { vOnCompleteValidator, Workpool } from "@convex-dev/workpool";
import { v } from "convex/values";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { components, internal } from "../convex/_generated/api";
import { internalAction, internalMutation } from "../convex/_generated/server";
import type { ActionCtx, MutationCtx } from "../convex/_generated/server";
import type { EnrichmentJobsDoc } from "./_generated/docs";
import type { Id } from "./_generated/id";
import { applyToTree, BACKGROUND_REQUEST_TIMEOUT_MS, rateLimiter, runSuggest } from "./enrichment";
import { groundedAnswer } from "./groundedLookup";
import type { GroundedCallDeps } from "./groundedLookup";
import { traced } from "./lib/aiTracing";
import { anthropicApiKey, claudeFastModelId, claudeGroundedModelId } from "./lib/config";
import type { EnrichmentResult } from "./lib/enrichmentResult";
import { knowledgeKey, knowledgeKeys } from "./lib/merchantKey";
import { CANONICAL_CATEGORY_NAMES, KEY_PATTERN } from "./lib/merchantTrust";
import { runEdge, runTransactionEdge } from "./lib/runEdge";

export const MIN_NAME_LENGTH = 3;
export const MAX_ACK_IDS = 100;
export const MAX_RESULTS = 50;

export const pool = new Workpool(components.enrichmentPool, {
    defaultRetryBehavior: { base: 3, initialBackoffMs: 30_000, maxAttempts: 5 },
    maxParallelism: 10,
    retryActionsByDefault: true,
});

export interface ResolveDeps {
    fast?: Parameters<typeof runSuggest>[0];
    grounded?: GroundedCallDeps;
}

type JobCtx = Pick<ActionCtx, "runMutation" | "runQuery" | "runAction" | "meta">;

const share = Effect.fn("EnrichmentQueue.share")(function* share(
    ctx: JobCtx,
    row: EnrichmentJobsDoc,
    answer: typeof EnrichmentResult.Type,
    modelId: string
) {
    const { categoryName, domain, merchantName } = answer;
    if (
        categoryName === null ||
        domain === null ||
        merchantName === null ||
        !CANONICAL_CATEGORY_NAMES.has(categoryName)
    ) {
        return answer;
    }
    const resolvedAt = yield* Clock.currentTimeMillis;
    yield* Effect.promise(() =>
        ctx.runMutation(internal.merchantKnowledge.record, {
            categoryName,
            domain,
            emoji: answer.emoji,
            keys: knowledgeKeys(row.name, row.currency, merchantName).filter((key) => KEY_PATTERN.test(key)),
            merchantName,
            modelId,
            parentCategoryName: null,
            resolvedAt,
            source: "model",
            tags: [...answer.tags],
        })
    );
    return answer;
});

export const resolveJob = Effect.fn("EnrichmentQueue.resolveJob")(function* resolveJob(
    ctx: JobCtx,
    row: EnrichmentJobsDoc,
    deps: ResolveDeps = {}
) {
    const key = knowledgeKey(row.name, row.currency);
    const distinctId = row.shareAnalytics === true ? row.userId : undefined;
    const now = yield* Clock.currentTimeMillis;
    const cached = yield* Effect.promise(() =>
        ctx.runQuery(internal.merchantKnowledge.lookup, {
            keys: knowledgeKeys(row.name, row.currency),
            now,
        })
    );
    if (cached !== null && (!row.grounded || (cached.source === "web" && cached.merchantName !== undefined))) {
        return applyToTree(row.categoryTree, cached);
    }
    // Spent when `suggest` or an earlier job (a retry included) already searched this merchant today.
    const perKey = row.grounded ? yield* Effect.promise(() => rateLimiter.limit(ctx, "groundedPerKey", { key })) : null;
    if (perKey?.ok) {
        const deep = yield* groundedAnswer(
            ctx,
            {
                categoryTree: row.categoryTree,
                currency: row.currency,
                distinctId,
                income: row.income,
                key,
                locale: row.locale,
                name: row.name,
                regionCode: row.regionCode,
            },
            deps.grounded
        );
        if (deep !== null && (deep.categoryName !== null || deep.domain !== null || deep.merchantName !== null)) {
            return yield* share(
                ctx,
                row,
                applyToTree(row.categoryTree, { ...deep, parentCategoryName: null }),
                yield* claudeGroundedModelId
            );
        }
    }
    const fastModelId = yield* claudeFastModelId;
    let model = deps.fast;
    if (model === undefined) {
        const apiKey = yield* anthropicApiKey;
        if (Option.isNone(apiKey)) {
            return null;
        }
        model = traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(fastModelId), "background_suggest", {
            distinctId,
        });
    }
    const { grounding: _grounding, ...fast } = yield* runSuggest(model, {
        categoryTree: row.categoryTree,
        currency: row.currency,
        income: row.income,
        locale: row.locale,
        name: row.name,
        regionCode: row.regionCode,
        timeoutMs: BACKGROUND_REQUEST_TIMEOUT_MS,
    });
    return yield* share(ctx, row, fast, fastModelId);
});

const workJob: (ctx: ActionCtx, jobId: Id<"enrichmentJobs">) => Effect.Effect<null> = Effect.fn("EnrichmentQueue.work")(
    function* workJob(ctx: ActionCtx, jobId: Id<"enrichmentJobs">) {
        const row = yield* Effect.promise(() => ctx.runQuery(internal.enrichmentQueue.job, { jobId }));
        if (row === null || row.status !== "queued") {
            return null;
        }
        const result = yield* resolveJob(ctx, row).pipe(
            Effect.catchTags({ ModelCallError: ({ cause }) => Effect.die(cause) })
        );
        yield* Effect.promise(() => ctx.runMutation(internal.enrichmentQueue.finish, { jobId, result }));
        return null;
    },
    Effect.orDie
);

export const work = internalAction({
    args: { jobId: v.id("enrichmentJobs") },
    handler: (ctx, args) => runEdge(workJob(ctx, args.jobId)),
    returns: v.null(),
});

const failUnsettled = Effect.fn("EnrichmentQueue.settled")(function* failUnsettled(
    ctx: MutationCtx,
    jobId: Id<"enrichmentJobs">
) {
    const row = yield* Effect.promise(() => ctx.db.get("enrichmentJobs", jobId));
    if (row?.status === "queued") {
        yield* Effect.promise(() => ctx.db.patch("enrichmentJobs", row._id, { status: "failed" }));
    }
    return null;
});

export const settled = internalMutation({
    args: vOnCompleteValidator(v.object({ jobId: v.id("enrichmentJobs") })),
    handler: (ctx, args) => runTransactionEdge(failUnsettled(ctx, args.context.jobId)),
    returns: v.null(),
});
