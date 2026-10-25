import { RateLimiter } from "@convex-dev/rate-limiter";
import type { RateLimitConfig } from "@convex-dev/rate-limiter";
import { v } from "convex/values";

import { components } from "../convex/_generated/api";
import { query } from "../convex/_generated/server";
import { FREE_CAPTURE_CONFIG, PRO_CAPTURE_CONFIG } from "./lib/captures";
import { perUserBurst } from "./lib/limits";
import { isPro } from "./revenuecat";

const reader = new RateLimiter(components.rateLimiter);

const bucket = v.object({
    capacity: v.number(),
    kind: v.union(v.literal("token bucket"), v.literal("fixed window")),
    period: v.number(),
    rate: v.number(),
    ts: v.number(),
    value: v.number(),
});

export const mine = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return null;
        }
        const pro = await isPro(ctx, identity.subject);
        const read = async (name: string, config: RateLimitConfig) => {
            const state = await reader.getValue(ctx, name, { config, key: identity.tokenIdentifier });
            return {
                capacity: state.config.capacity ?? state.config.rate,
                kind: state.config.kind,
                period: state.config.period,
                rate: state.config.rate,
                ts: state.ts,
                value: state.value,
            };
        };
        const [captures, csvImport, enrichment, receiptScan, voiceEntry] = await Promise.all([
            read(pro ? "capturesPro" : "capturesFree", pro ? PRO_CAPTURE_CONFIG : FREE_CAPTURE_CONFIG),
            read("csvImportPerUser", perUserBurst("csvImport", true)),
            read("enrichmentPerUser", perUserBurst("enrichment", pro)),
            read("receiptScanPerUser", perUserBurst("receiptScan", pro)),
            read("voiceEntryPerUser", perUserBurst("voiceEntry", pro)),
        ]);
        return { captures, csvImport: pro ? csvImport : null, enrichment, pro, receiptScan, voiceEntry };
    },
    returns: v.union(
        v.null(),
        v.object({
            captures: bucket,
            csvImport: v.union(bucket, v.null()),
            enrichment: bucket,
            pro: v.boolean(),
            receiptScan: bucket,
            voiceEntry: bucket,
        })
    ),
});
