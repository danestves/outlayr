import { v } from "convex/values";
import type { Infer } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { MODEL_TTL_MS, WEB_TTL_MS } from "./lib/merchantTrust";

// Everything here stays internal: a public exact-key oracle over this shared table is a dictionary-enumeration
// surface (threat T5). Never add a listing, prefix or range read over `by_key`.

const MAX_KEYS = 5;

const source = v.union(v.literal("model"), v.literal("web"));

const knowledgeFields = {
    categoryName: v.string(),
    domain: v.string(),
    emoji: v.union(v.string(), v.null()),
    merchantName: v.optional(v.string()),
    modelId: v.string(),
    parentCategoryName: v.union(v.string(), v.null()),
    tags: v.array(v.string()),
};

const knowledgeRecord = v.object({
    key: v.string(),
    resolvedAt: v.number(),
    source,
    ...knowledgeFields,
});

function sourceOf(row: Doc<"merchantKnowledge">): Infer<typeof source> {
    return row.source ?? "web";
}

function expiresAt(row: Doc<"merchantKnowledge">): number {
    return row.expiresAt ?? row.resolvedAt + WEB_TTL_MS;
}

async function findKnowledge(ctx: QueryCtx, keys: readonly string[], now: number) {
    for (const key of keys.slice(0, MAX_KEYS)) {
        // oxlint-disable-next-line no-await-in-loop -- the keys are tried in order of trust, raw name first, and the first live row answers
        const row = await ctx.db
            .query("merchantKnowledge")
            .withIndex("by_key", (q) => q.eq("key", key))
            .unique();
        if (row !== null && expiresAt(row) > now) {
            return {
                categoryName: row.categoryName,
                domain: row.domain,
                emoji: row.emoji,
                key: row.key,
                merchantName: row.merchantName,
                modelId: row.modelId,
                parentCategoryName: row.parentCategoryName,
                resolvedAt: row.resolvedAt,
                source: sourceOf(row),
                tags: row.tags,
            };
        }
    }
    return null;
}

export const lookup = internalQuery({
    args: { keys: v.array(v.string()), now: v.number() },
    handler: async (ctx, args) => await findKnowledge(ctx, args.keys, args.now),
    returns: v.union(knowledgeRecord, v.null()),
});

export const lookupMany = internalQuery({
    args: { keyLists: v.array(v.array(v.string())), now: v.number() },
    handler: async (ctx, args) => await Promise.all(args.keyLists.map((keys) => findKnowledge(ctx, keys, args.now))),
    returns: v.array(v.union(knowledgeRecord, v.null())),
});

export const record = internalMutation({
    args: {
        keys: v.array(v.string()),
        resolvedAt: v.number(),
        source,
        ...knowledgeFields,
    },
    handler: async (ctx, { keys, ...args }) => {
        const row = {
            ...args,
            expiresAt: args.resolvedAt + (args.source === "web" ? WEB_TTL_MS : MODEL_TTL_MS),
        };
        for (const key of keys.slice(0, MAX_KEYS)) {
            // oxlint-disable-next-line no-await-in-loop -- one indexed point read and write per key, inside one transaction
            const existing = await ctx.db
                .query("merchantKnowledge")
                .withIndex("by_key", (q) => q.eq("key", key))
                .unique();
            if (existing === null) {
                // oxlint-disable-next-line no-await-in-loop -- see above
                await ctx.db.insert("merchantKnowledge", { ...row, key });
            } else if (
                args.source === "web" ||
                sourceOf(existing) === "model" ||
                expiresAt(existing) <= args.resolvedAt
            ) {
                // oxlint-disable-next-line no-await-in-loop -- see above
                await ctx.db.patch("merchantKnowledge", existing._id, { ...row, key });
            }
        }
        return null;
    },
    returns: v.null(),
});

export const purge = internalMutation({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("merchantKnowledge")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();
        if (existing !== null) {
            await ctx.db.delete("merchantKnowledge", existing._id);
        }
        return null;
    },
    returns: v.null(),
});
