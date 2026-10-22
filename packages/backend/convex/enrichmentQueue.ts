// oxlint-disable unicorn/filename-case -- the Convex module name is the function path: clients address these as enrichmentQueue:enqueue, enrichmentQueue:results and enrichmentQueue:ack

import { createAnthropic } from "@ai-sdk/anthropic";
import { vOnCompleteValidator, Workpool } from "@convex-dev/workpool";
import { v } from "convex/values";
import type { Infer } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import {
    applyToTree,
    BACKGROUND_REQUEST_TIMEOUT_MS,
    MAX_NAME_LENGTH,
    rateLimiter,
    runSuggest,
    sanitizeCurrencyCode,
    sanitizeRegionCode,
} from "./enrichment";
import { groundedAnswer } from "./groundedLookup";
import type { GroundedCallDeps } from "./groundedLookup";
import { optionalUserId, requireUserId } from "./lib/auth";
import { knowledgeKey, knowledgeKeys } from "./lib/merchantKey";
import { CANONICAL_CATEGORY_NAMES, KEY_PATTERN } from "./lib/merchantTrust";
import { AI_CONSENT_VERSION, CLAUDE_FAST_MODEL_ID } from "./lib/models";
import { isPro } from "./revenuecat";
import { enrichmentResult } from "./schema";

const MIN_NAME_LENGTH = 3;
const MAX_ACK_IDS = 100;
const MAX_RESULTS = 50;

const pool = new Workpool(components.enrichmentPool, {
    defaultRetryBehavior: { base: 3, initialBackoffMs: 30_000, maxAttempts: 5 },
    maxParallelism: 10,
    retryActionsByDefault: true,
});

type EnrichmentResult = Infer<typeof enrichmentResult>;

export const enqueue = mutation({
    args: {
        aiConsent: v.optional(v.number()),
        categoryTree: v.array(v.object({ children: v.array(v.string()), name: v.string() })),
        currency: v.optional(v.string()),
        groundedLookup: v.boolean(),
        income: v.boolean(),
        localId: v.string(),
        locale: v.optional(v.string()),
        name: v.string(),
        regionCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await requireUserId(ctx);
        const name = args.name.trim();
        if (args.aiConsent !== AI_CONSENT_VERSION || name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            return false;
        }
        const gate = await rateLimiter.limit(ctx, "enrichmentQueue", { key: userId });
        if (!gate.ok) {
            return false;
        }
        const identity = await ctx.auth.getUserIdentity();
        const grounded =
            args.groundedLookup &&
            identity !== null &&
            (await ctx.runQuery(internal.enrichment.groundedConsent, {})) &&
            (await isPro(ctx, identity.subject));
        const existing = await ctx.db
            .query("enrichmentJobs")
            .withIndex("by_user_and_localId", (q) => q.eq("userId", userId).eq("localId", args.localId))
            .unique();
        if (existing !== null) {
            await ctx.db.delete("enrichmentJobs", existing._id);
        }
        const jobId = await ctx.db.insert("enrichmentJobs", {
            categoryTree: args.categoryTree,
            currency: sanitizeCurrencyCode(args.currency),
            grounded,
            income: args.income,
            localId: args.localId,
            locale: args.locale,
            name,
            regionCode: sanitizeRegionCode(args.regionCode),
            status: "queued",
            userId,
        });
        await pool.enqueueAction(
            ctx,
            internal.enrichmentQueue.work,
            { jobId },
            { context: { jobId }, onComplete: internal.enrichmentQueue.settled, onCompleteExcludeKinds: ["success"] }
        );
        return true;
    },
    returns: v.boolean(),
});

export const job = internalQuery({
    args: { jobId: v.id("enrichmentJobs") },
    handler: async (ctx, args) => await ctx.db.get("enrichmentJobs", args.jobId),
});

export interface ResolveDeps {
    fast?: Parameters<typeof runSuggest>[0];
    grounded?: GroundedCallDeps;
}

type JobCtx = Pick<ActionCtx, "runMutation" | "runQuery">;

async function share(
    ctx: JobCtx,
    row: Doc<"enrichmentJobs">,
    answer: EnrichmentResult,
    modelId: string
): Promise<EnrichmentResult> {
    const { categoryName, domain, merchantName } = answer;
    if (
        categoryName === null ||
        domain === null ||
        merchantName === null ||
        !CANONICAL_CATEGORY_NAMES.has(categoryName)
    ) {
        return answer;
    }
    await ctx.runMutation(internal.merchantKnowledge.record, {
        categoryName,
        domain,
        emoji: answer.emoji,
        keys: knowledgeKeys(row.name, row.currency, merchantName).filter((key) => KEY_PATTERN.test(key)),
        merchantName,
        modelId,
        parentCategoryName: null,
        resolvedAt: Date.now(),
        source: "model",
        tags: answer.tags,
    });
    return answer;
}

export async function resolveJob(
    ctx: JobCtx,
    row: Doc<"enrichmentJobs">,
    deps: ResolveDeps = {}
): Promise<EnrichmentResult | null> {
    const key = knowledgeKey(row.name, row.currency);
    const cached = await ctx.runQuery(internal.merchantKnowledge.lookup, {
        keys: knowledgeKeys(row.name, row.currency),
        now: Date.now(),
    });
    if (cached !== null && (!row.grounded || (cached.source === "web" && cached.merchantName !== undefined))) {
        return applyToTree(row.categoryTree, cached);
    }
    // Spent when `suggest` or an earlier job (a retry included) already searched this merchant today.
    const perKey = row.grounded ? await rateLimiter.limit(ctx, "groundedPerKey", { key }) : null;
    if (perKey?.ok) {
        const deep = await groundedAnswer(
            ctx,
            {
                categoryTree: row.categoryTree,
                currency: row.currency,
                income: row.income,
                key,
                locale: row.locale,
                name: row.name,
                regionCode: row.regionCode,
            },
            deps.grounded
        );
        if (deep !== null && (deep.categoryName !== null || deep.domain !== null || deep.merchantName !== null)) {
            return await share(
                ctx,
                row,
                applyToTree(row.categoryTree, { ...deep, parentCategoryName: null }),
                process.env.CLAUDE_GROUNDED_MODEL_ID || CLAUDE_FAST_MODEL_ID
            );
        }
    }
    const fastModelId = process.env.CLAUDE_FAST_MODEL_ID || CLAUDE_FAST_MODEL_ID;
    let model = deps.fast;
    if (model === undefined) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return null;
        }
        model = createAnthropic({ apiKey })(fastModelId);
    }
    const { grounding: _grounding, ...fast } = await runSuggest(model, {
        categoryTree: row.categoryTree,
        currency: row.currency,
        income: row.income,
        locale: row.locale,
        name: row.name,
        regionCode: row.regionCode,
        timeoutMs: BACKGROUND_REQUEST_TIMEOUT_MS,
    });
    return await share(ctx, row, fast, fastModelId);
}

export const work = internalAction({
    args: { jobId: v.id("enrichmentJobs") },
    handler: async (ctx, args) => {
        const row = await ctx.runQuery(internal.enrichmentQueue.job, { jobId: args.jobId });
        if (row === null || row.status !== "queued") {
            return null;
        }
        const result = await resolveJob(ctx, row);
        await ctx.runMutation(internal.enrichmentQueue.finish, { jobId: args.jobId, result });
        return null;
    },
    returns: v.null(),
});

export const finish = internalMutation({
    args: { jobId: v.id("enrichmentJobs"), result: v.union(enrichmentResult, v.null()) },
    handler: async (ctx, args) => {
        const row = await ctx.db.get("enrichmentJobs", args.jobId);
        if (row === null) {
            return null;
        }
        await ctx.db.patch(
            "enrichmentJobs",
            args.jobId,
            args.result === null ? { status: "failed" } : { result: args.result, status: "done" }
        );
        return null;
    },
    returns: v.null(),
});

export const settled = internalMutation({
    args: vOnCompleteValidator(v.object({ jobId: v.id("enrichmentJobs") })),
    handler: async (ctx, args) => {
        const row = await ctx.db.get("enrichmentJobs", args.context.jobId);
        if (row?.status === "queued") {
            await ctx.db.patch("enrichmentJobs", row._id, { status: "failed" });
        }
        return null;
    },
    returns: v.null(),
});

const answered = v.object({
    localId: v.string(),
    name: v.string(),
    result: v.union(enrichmentResult, v.null()),
});

export const results = query({
    args: {},
    handler: async (ctx) => {
        const userId = await optionalUserId(ctx);
        if (userId === null) {
            return [];
        }
        const [done, failed] = await Promise.all(
            (["done", "failed"] as const).map((status) =>
                ctx.db
                    .query("enrichmentJobs")
                    .withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", status))
                    .take(MAX_RESULTS)
            )
        );
        return [...done, ...failed].map((row) => ({
            localId: row.localId,
            name: row.name,
            result: row.result ?? null,
        }));
    },
    returns: v.array(answered),
});

export const ack = mutation({
    args: { localIds: v.array(v.string()) },
    handler: async (ctx, args) => {
        const userId = await requireUserId(ctx);
        for (const localId of args.localIds.slice(0, MAX_ACK_IDS)) {
            // oxlint-disable-next-line no-await-in-loop -- each id is its own indexed point read and delete inside one transaction
            const row = await ctx.db
                .query("enrichmentJobs")
                .withIndex("by_user_and_localId", (q) => q.eq("userId", userId).eq("localId", localId))
                .unique();
            if (row !== null && row.status !== "queued") {
                // oxlint-disable-next-line no-await-in-loop -- see above
                await ctx.db.delete("enrichmentJobs", row._id);
            }
        }
        return null;
    },
    returns: v.null(),
});
