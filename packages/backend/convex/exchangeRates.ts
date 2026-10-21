// oxlint-disable unicorn/filename-case -- a Convex module's path is its public API: this file is addressed as internal.exchangeRates.* from the crons and from apps/native
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, query } from "./_generated/server";
import { marketRateType, PICKABLE_CURRENCY_CODES, rateSource, utcDateString } from "./lib/currencies";
import type { MarketRateType } from "./lib/currencies";

const PRUNE_BATCH_SIZE = 200;

// Back-to-back batches cross the deployment's per-second write budget, since each delete also rewrites two indexes.
const PRUNE_BATCH_INTERVAL_MS = 1000;

const PRUNE_MAX_RETRIES = 4;
const PRUNE_RETRY_BASE_MS = 5000;

type PruneBatchOutcome = { cursor: string; failed: false; isDone: boolean } | { failed: true };

interface PruneStep {
    cursor: string | null;
    delayMs: number;
    retries: number;
}

export function nextPruneStep(
    outcome: PruneBatchOutcome,
    current: { cursor: string | null; retries: number }
): PruneStep | null {
    if (outcome.failed) {
        // A failed batch rolled its deletes back, so the retry resumes at the SAME cursor.
        if (current.retries >= PRUNE_MAX_RETRIES) {
            return null;
        }
        return {
            cursor: current.cursor,
            delayMs: PRUNE_RETRY_BASE_MS * 2 ** current.retries,
            retries: current.retries + 1,
        };
    }
    if (outcome.isDone) {
        return null;
    }
    return { cursor: outcome.cursor, delayMs: PRUNE_BATCH_INTERVAL_MS, retries: 0 };
}

export const RATES_WINDOW_DAYS = 90;
const MS_PER_DAY = 86_400_000;
const OLDEST_CALLER_INSTANT_MS = 2 * RATES_WINDOW_DAYS * MS_PER_DAY;

// `pullRates` serves and `pruneStale` keeps the same set only while both derive the boundary here. Never inline it.
export function ratesWindowStart(at: number = Date.now()): string {
    return utcDateString(at - RATES_WINDOW_DAYS * MS_PER_DAY);
}

// `31` for every month: dates sort lexically, so `2026-02-31` bounds February though it is not a date.
function monthEndBound(date: string): string {
    return `${date.slice(0, 8)}31`;
}

interface RatePair {
    quote: string;
    rateType: MarketRateType;
}

const ANCHOR_PAIR_CATALOG: readonly RatePair[] = [
    ...PICKABLE_CURRENCY_CODES.filter((code) => code !== "USD").map((code) => ({
        quote: code,
        rateType: "official" as const,
    })),
    { quote: "VES", rateType: "eur_reference" },
    { quote: "VES", rateType: "binance" },
];

export const MONTHLY_ANCHOR_LIMIT = 240;

// 12 x (90 window days + same-day row + 240 monthly anchors) = 3,972 docs per page, under Convex's 16,384 ceiling.
export const PAIRS_PER_PAGE = 12;

function toRateWire(doc: Doc<"exchangeRates">) {
    return {
        date: doc.date,
        fetchedAt: doc.fetchedAt,
        quote: doc.quote,
        rate: doc.rate,
        rateType: doc.rateType,
        source: doc.source,
    };
}

export const upsertRates = internalMutation({
    args: {
        date: v.string(),
        fetchedAt: v.number(),
        rates: v.array(
            v.object({
                quote: v.string(),
                rate: v.number(),
                rateType: marketRateType,
            })
        ),
        source: rateSource,
    },
    handler: async (ctx, args) => {
        /* oxlint-disable no-await-in-loop -- rates arrive from an upstream HTTP payload, so a repeated (quote, rateType) must read back the row the previous iteration wrote; running the array in parallel would insert the pair twice */
        for (const entry of args.rates) {
            if (!Number.isFinite(entry.rate) || entry.rate <= 0) {
                continue;
            }

            const existing = await ctx.db
                .query("exchangeRates")
                .withIndex("by_quote_and_rateType_and_date", (q) =>
                    q.eq("quote", entry.quote).eq("rateType", entry.rateType).eq("date", args.date)
                )
                .unique();

            if (existing) {
                if (args.source !== "cotizave" && existing.source === "cotizave") {
                    continue;
                }
                await ctx.db.patch("exchangeRates", existing._id, {
                    fetchedAt: args.fetchedAt,
                    rate: entry.rate,
                    source: args.source,
                });
            } else {
                await ctx.db.insert("exchangeRates", {
                    date: args.date,
                    fetchedAt: args.fetchedAt,
                    quote: entry.quote,
                    rate: entry.rate,
                    rateType: entry.rateType,
                    source: args.source,
                });
            }
        }
        /* oxlint-enable no-await-in-loop */
        return null;
    },
    returns: v.null(),
});

interface PruneBatchResult {
    cursor: string;
    deleted: number;
    isDone: boolean;
}

// Schedules nothing: a mutation that throws rolls back its own `runAfter`, so the chain lives in `pruneStale`.
export const pruneStaleBatch = internalMutation({
    args: {
        cursor: v.union(v.string(), v.null()),
        windowStart: v.string(),
    },
    handler: async (ctx, args) => {
        const { windowStart } = args;

        const page = await ctx.db
            .query("exchangeRates")
            .withIndex("by_date", (q) => q.lt("date", windowStart))
            .paginate({ cursor: args.cursor, numItems: PRUNE_BATCH_SIZE });

        let deleted = 0;
        /* oxlint-disable no-await-in-loop -- each lookup must observe the deletes this pass already made, so parallelising the page would make the mutation's read set depend on promise scheduling */
        for (const row of page.page) {
            // An index range takes one upper bound per field, so the tighter of month end and window start is chosen.
            const monthEnd = monthEndBound(row.date);
            const newer = await ctx.db
                .query("exchangeRates")
                .withIndex("by_quote_and_rateType_and_date", (q) => {
                    const from = q.eq("quote", row.quote).eq("rateType", row.rateType).gt("date", row.date);
                    return monthEnd < windowStart ? from.lte("date", monthEnd) : from.lt("date", windowStart);
                })
                .take(1);
            if (newer.length > 0) {
                await ctx.db.delete("exchangeRates", row._id);
                deleted += 1;
            }
        }
        /* oxlint-enable no-await-in-loop */

        return { cursor: page.continueCursor, deleted, isDone: page.isDone };
    },
    returns: v.object({ cursor: v.string(), deleted: v.number(), isDone: v.boolean() }),
});

// An action: a mutation's `runAfter` dies with a batch that hits the write-rate limit, and the pass never drains.
export const pruneStale = internalAction({
    args: {
        cursor: v.optional(v.union(v.string(), v.null())),
        retries: v.optional(v.number()),
        windowStart: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const windowStart = args.windowStart ?? ratesWindowStart();
        const cursor = args.cursor ?? null;
        const retries = args.retries ?? 0;

        let batch: PruneBatchResult;
        try {
            batch = await ctx.runMutation(internal.exchangeRates.pruneStaleBatch, { cursor, windowStart });
        } catch (error) {
            const retry = nextPruneStep({ failed: true }, { cursor, retries });
            if (!retry) {
                throw error;
            }
            console.error(
                `Prune batch failed, retry ${retry.retries} of ${PRUNE_MAX_RETRIES} in ${retry.delayMs}ms`,
                error
            );
            await ctx.scheduler.runAfter(retry.delayMs, internal.exchangeRates.pruneStale, {
                cursor: retry.cursor,
                retries: retry.retries,
                windowStart,
            });
            return { deleted: 0, isDone: false };
        }

        const step = nextPruneStep({ cursor: batch.cursor, failed: false, isDone: batch.isDone }, { cursor, retries });
        if (step) {
            await ctx.scheduler.runAfter(step.delayMs, internal.exchangeRates.pruneStale, {
                cursor: step.cursor,
                retries: step.retries,
                windowStart,
            });
        }
        return { deleted: batch.deleted, isDone: batch.isDone };
    },
    returns: v.object({ deleted: v.number(), isDone: v.boolean() }),
});

// Deliberately unauthenticated: rates are market data that reveal nothing about a user.
export const pullRates = query({
    args: { at: v.optional(v.number()), cursor: v.optional(v.number()) },
    handler: async (ctx, args) => {
        // An argument, not the wall clock: a query is not rerun as time passes, so it would serve yesterday's window.
        const windowStart = ratesWindowStart(Math.max(args.at ?? Date.now(), Date.now() - OLDEST_CALLER_INSTANT_MS));
        const start = args.cursor ?? 0;
        const pagePairs = ANCHOR_PAIR_CATALOG.slice(start, start + PAIRS_PER_PAGE);

        const pairPages = await Promise.all(
            pagePairs.flatMap(({ quote, rateType }) => [
                ctx.db
                    .query("exchangeRates")
                    .withIndex("by_quote_and_rateType_and_date", (q) =>
                        q.eq("quote", quote).eq("rateType", rateType).gte("date", windowStart)
                    )
                    .collect(),
                // Pruning leaves one row per month, so an entry older than the window values at a rate from its time.
                ctx.db
                    .query("exchangeRates")
                    .withIndex("by_quote_and_rateType_and_date", (q) =>
                        q.eq("quote", quote).eq("rateType", rateType).lt("date", windowStart)
                    )
                    .order("desc")
                    .take(MONTHLY_ANCHOR_LIMIT),
            ])
        );

        const rows = pairPages.flat().map(toRateWire);
        const nextIndex = start + PAIRS_PER_PAGE;
        const nextCursor = nextIndex < ANCHOR_PAIR_CATALOG.length ? nextIndex : null;
        return { nextCursor, rows, windowStart };
    },
});

const RECENT_ROWS_LIMIT = 1000;
const CATALOG_PAIR_KEYS = new Set(ANCHOR_PAIR_CATALOG.map(({ quote, rateType }) => `${quote}:${rateType}`));

export const pullRecentRates = query({
    args: { at: v.number() },
    handler: async (ctx, args) => {
        const rows = await ctx.db
            .query("exchangeRates")
            .withIndex("by_date", (q) => q.gte("date", utcDateString(args.at - MS_PER_DAY)))
            .take(RECENT_ROWS_LIMIT);
        return rows.filter((row) => CATALOG_PAIR_KEYS.has(`${row.quote}:${row.rateType}`)).map(toRateWire);
    },
});
