import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { budgetCeilingMicros } from "./lib/spend";

// Read only through `npx convex run`: no public query, no client UI.

export const record = internalMutation({
    args: {
        actualMicros: v.number(),
        at: v.number(),
        chargedMicros: v.number(),
        inputTokens: v.number(),
        outputTokens: v.number(),
        published: v.boolean(),
        searchCalls: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("groundedSpend", args);
        return null;
    },
    returns: v.null(),
});

function monthStartMs(at: number): number {
    const date = new Date(at);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

const MAX_MONTH_ROWS = 10_000;

export const monthlyTotal = internalQuery({
    args: { at: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const start = monthStartMs(args.at ?? Date.now());
        const rows = await ctx.db
            .query("groundedSpend")
            .withIndex("by_at", (q) => q.gte("at", start))
            .take(MAX_MONTH_ROWS);
        const totalMicros = rows.reduce((sum, row) => sum + row.actualMicros, 0);
        return { ceilingMicros: budgetCeilingMicros(), totalMicros };
    },
    returns: v.object({ ceilingMicros: v.number(), totalMicros: v.number() }),
});
