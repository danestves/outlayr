import { vOnCompleteValidator, Workpool } from "@convex-dev/workpool";
import { resolveTextModel } from "@outlayr/ai/model";
import type { TextModel } from "@outlayr/ai/model";
import { escalation, route } from "@outlayr/model-router/route";
import type { Route } from "@outlayr/model-router/route";
import { knowledgeKey, knowledgeKeys } from "@outlayr/money/merchant-key";
import { v } from "convex/values";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { components, internal } from "../convex/_generated/api";
import { internalAction, internalMutation } from "../convex/_generated/server";
import type { ActionCtx, MutationCtx } from "../convex/_generated/server";
import type { EnrichmentJobsDoc } from "./_generated/docs";
import type { Id } from "./_generated/id";
import { applyToTree, BACKGROUND_REQUEST_TIMEOUT_MS, rateLimiter, runSuggest } from "./enrichment";
import { groundedAnswer } from "./groundedLookup";
import type { GroundedCallDeps } from "./groundedLookup";
import { traceModel } from "./lib/aiTracing";
import type { EnrichmentResult } from "./lib/enrichmentResult";
import { CANONICAL_CATEGORIES, KEY_PATTERN } from "./lib/merchantTrust";
import { runEdge, runTransactionEdge } from "./lib/runEdge";
import { budgetConfig, estimateMicros } from "./lib/spend";

export const MIN_NAME_LENGTH = 3;
export const MAX_ACK_IDS = 100;
export const MAX_RESULTS = 50;

export const pool = new Workpool(components.enrichmentPool, {
    defaultRetryBehavior: { base: 3, initialBackoffMs: 30_000, maxAttempts: 5 },
    maxParallelism: 10,
    retryActionsByDefault: true,
});

export interface ResolveDeps {
    fast?: (chosen: Route) => Effect.Effect<Option.Option<TextModel>>;
    grounded?: GroundedCallDeps;
}

type JobCtx = Pick<ActionCtx, "runMutation" | "runQuery" | "runAction" | "meta">;

export const share = Effect.fn("EnrichmentQueue.share")(function* share(
    ctx: JobCtx,
    row: EnrichmentJobsDoc,
    answer: typeof EnrichmentResult.Type,
    modelId: string
) {
    const { categoryName, domain, merchantName } = answer;
    if (categoryName === null || domain === null || merchantName === null || !CANONICAL_CATEGORIES.has(categoryName)) {
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

// The grounded lookup's own headroom test, so `GROUNDED_BUDGET_MICROS=0` also keeps background jobs off Sonnet.
const budgetState = Effect.fn("EnrichmentQueue.budgetState")(function* budgetState(ctx: JobCtx) {
    const config = yield* budgetConfig();
    const count = yield* estimateMicros();
    // The limiter throws, not refuses, when one charge outgrows a shard's capacity, as a zero budget does.
    if (count > config.rate / config.shards) {
        return "exhausted";
    }
    const { ok } = yield* Effect.promise(() => rateLimiter.check(ctx, "groundedBudgetMicros", { config, count }));
    return ok ? "open" : "exhausted";
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
        const found = deep?.answer ?? null;
        if (
            deep !== null &&
            found !== null &&
            (found.categoryName !== null || found.domain !== null || found.merchantName !== null)
        ) {
            return yield* share(ctx, row, applyToTree(row.categoryTree, found), deep.modelId);
        }
    }
    const request = { budget: yield* budgetState(ctx), feature: "background_suggest" } as const;
    const resolve =
        deps.fast ??
        ((chosen: Route) =>
            Effect.map(
                resolveTextModel(chosen),
                Option.map((model) => traceModel(model, { distinctId }))
            ));
    const suggest = Effect.fn("EnrichmentQueue.suggest")(function* suggest(chosen: Route) {
        const resolved = yield* resolve(chosen);
        if (Option.isNone(resolved)) {
            return null;
        }
        const model = resolved.value;
        const { grounding: _grounding, ...answer } = yield* runSuggest(model, {
            categoryTree: row.categoryTree,
            currency: row.currency,
            income: row.income,
            locale: row.locale,
            name: row.name,
            regionCode: row.regionCode,
            timeoutMs: BACKGROUND_REQUEST_TIMEOUT_MS,
        });
        return { answer, modelId: model.modelId };
    });
    const firstTry = yield* suggest(route(request));
    if (firstTry === null) {
        return null;
    }
    const second = escalation(request, firstTry.answer);
    const retry =
        second === null
            ? null
            : yield* suggest(second).pipe(Effect.catchTags({ ModelCallError: () => Effect.succeed(null) }));
    const final = retry ?? firstTry;
    return yield* share(ctx, row, final.answer, final.modelId);
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
