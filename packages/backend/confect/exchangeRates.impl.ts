import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";

import type { ExchangeRatesDoc } from "./_generated/docs";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationRunner, Scheduler } from "./_generated/services";
import {
    ANCHOR_PAIR_CATALOG,
    CATALOG_PAIR_KEYS,
    monthEndBound,
    MONTHLY_ANCHOR_LIMIT,
    MS_PER_DAY,
    nextPruneStep,
    OLDEST_CALLER_INSTANT_MS,
    PAIRS_PER_PAGE,
    PRUNE_BATCH_SIZE,
    PRUNE_MAX_RETRIES,
    ratesWindowStart,
    RECENT_ROWS_LIMIT,
} from "./exchangeRates";
import spec from "./exchangeRates.spec";
import { utcDateString } from "./lib/currencies";

const toRateWire = ({ date, fetchedAt, quote, rate, rateType, source }: ExchangeRatesDoc) => ({
    date,
    fetchedAt,
    quote,
    rate,
    rateType,
    source,
});

const upsertRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "upsertRates",
    Effect.fn("ExchangeRates.upsertRates")(function* upsertRates(args) {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        // Rates arrive from an upstream HTTP payload, so a repeated (quote, rateType) must read back the row the
        // previous iteration wrote; running the array in parallel would insert the pair twice
        for (const entry of args.rates) {
            if (!Number.isFinite(entry.rate) || entry.rate <= 0) {
                continue;
            }

            const existing = yield* reader
                .table("exchangeRates")
                .get("by_quote_and_rateType_and_date", entry.quote, entry.rateType, args.date)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));

            if (existing) {
                if (args.source !== "cotizave" && existing.source === "cotizave") {
                    continue;
                }
                yield* writer.table("exchangeRates").patch(existing._id, {
                    fetchedAt: args.fetchedAt,
                    rate: entry.rate,
                    source: args.source,
                });
            } else {
                yield* writer.table("exchangeRates").insert({
                    date: args.date,
                    fetchedAt: args.fetchedAt,
                    quote: entry.quote,
                    rate: entry.rate,
                    rateType: entry.rateType,
                    source: args.source,
                });
            }
        }
        return null;
    }, Effect.orDie)
);

// Schedules nothing: a mutation that throws rolls back its own `runAfter`, so the chain lives in `pruneStale`.
const pruneStaleBatch = FunctionImpl.make(
    databaseSchema,
    spec,
    "pruneStaleBatch",
    Effect.fn("ExchangeRates.pruneStaleBatch")(function* pruneStaleBatch({ cursor, windowStart }) {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;

        const page = yield* reader
            .table("exchangeRates")
            .index("by_date", (q) => q.lt("date", windowStart))
            .paginate({ cursor, numItems: PRUNE_BATCH_SIZE });

        let deleted = 0;
        // Each lookup must observe the deletes this pass already made, so parallelising the page would make the
        // mutation's read set depend on promise scheduling
        for (const row of page.page) {
            // An index range takes one upper bound per field, so the tighter of month end and window start is chosen.
            const monthEnd = monthEndBound(row.date);
            const newer = yield* reader
                .table("exchangeRates")
                .index("by_quote_and_rateType_and_date", (q) => {
                    const from = q.eq("quote", row.quote).eq("rateType", row.rateType).gt("date", row.date);
                    return monthEnd < windowStart ? from.lte("date", monthEnd) : from.lt("date", windowStart);
                })
                .take(1);
            if (newer.length > 0) {
                yield* writer.table("exchangeRates").delete(row._id);
                deleted += 1;
            }
        }

        return { cursor: page.continueCursor, deleted, isDone: page.isDone };
    }, Effect.orDie)
);

// An action: a mutation's `runAfter` dies with a batch that hits the write-rate limit, and the pass never drains.
const pruneStale = FunctionImpl.make(
    databaseSchema,
    spec,
    "pruneStale",
    Effect.fn("ExchangeRates.pruneStale")(function* pruneStale(args) {
        const { runMutation } = yield* MutationRunner;
        const scheduler = yield* Scheduler;
        const windowStart = args.windowStart ?? ratesWindowStart(yield* Clock.currentTimeMillis);
        const cursor = args.cursor ?? null;
        const retries = args.retries ?? 0;

        const batch = yield* Effect.exit(
            runMutation(refs.internal.exchangeRates.pruneStaleBatch, { cursor, windowStart })
        );
        if (Exit.isFailure(batch)) {
            const retry = nextPruneStep({ failed: true }, { cursor, retries });
            if (!retry) {
                return yield* Effect.failCause(batch.cause);
            }
            yield* Effect.logError(
                `Prune batch failed, retry ${retry.retries} of ${PRUNE_MAX_RETRIES} in ${retry.delayMs}ms`,
                batch.cause
            );
            yield* scheduler.runAfter(Duration.millis(retry.delayMs), refs.internal.exchangeRates.pruneStale, {
                cursor: retry.cursor,
                retries: retry.retries,
                windowStart,
            });
            return { deleted: 0, isDone: false };
        }

        const { value } = batch;
        const step = nextPruneStep({ cursor: value.cursor, failed: false, isDone: value.isDone }, { cursor, retries });
        if (step) {
            yield* scheduler.runAfter(Duration.millis(step.delayMs), refs.internal.exchangeRates.pruneStale, {
                cursor: step.cursor,
                retries: step.retries,
                windowStart,
            });
        }
        return { deleted: value.deleted, isDone: value.isDone };
    }, Effect.orDie)
);

// Deliberately unauthenticated: rates are market data that reveal nothing about a user.
const pullRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "pullRates",
    Effect.fn("ExchangeRates.pullRates")(function* pullRates(args) {
        const reader = yield* DatabaseReader;
        const now = yield* Clock.currentTimeMillis;
        // An argument, not the wall clock: a query is not rerun as time passes, so it would serve yesterday's window.
        const windowStart = ratesWindowStart(Math.max(args.at ?? now, now - OLDEST_CALLER_INSTANT_MS));
        const start = args.cursor ?? 0;
        const pagePairs = ANCHOR_PAIR_CATALOG.slice(start, start + PAIRS_PER_PAGE);

        const pairPages = yield* Effect.all(
            pagePairs.flatMap(({ quote, rateType }) => [
                reader
                    .table("exchangeRates")
                    .index("by_quote_and_rateType_and_date", (q) =>
                        q.eq("quote", quote).eq("rateType", rateType).gte("date", windowStart)
                    )
                    .collect(),
                // Pruning leaves one row per month, so an entry older than the window values at a rate from its time.
                reader
                    .table("exchangeRates")
                    .index(
                        "by_quote_and_rateType_and_date",
                        (q) => q.eq("quote", quote).eq("rateType", rateType).lt("date", windowStart),
                        "desc"
                    )
                    .take(MONTHLY_ANCHOR_LIMIT),
            ]),
            { concurrency: "unbounded" }
        );

        const rows = pairPages.flat().map(toRateWire);
        const nextIndex = start + PAIRS_PER_PAGE;
        const nextCursor = nextIndex < ANCHOR_PAIR_CATALOG.length ? nextIndex : null;
        return { nextCursor, rows, windowStart };
    }, Effect.orDie)
);

const pullRecentRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "pullRecentRates",
    Effect.fn("ExchangeRates.pullRecentRates")(function* pullRecentRates({ at }) {
        const reader = yield* DatabaseReader;
        const rows = yield* reader
            .table("exchangeRates")
            .index("by_date", (q) => q.gte("date", utcDateString(at - MS_PER_DAY)))
            .take(RECENT_ROWS_LIMIT);
        return rows.filter((row) => CATALOG_PAIR_KEYS.has(`${row.quote}:${row.rateType}`)).map(toRateWire);
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(upsertRates),
    Layer.provide(pruneStaleBatch),
    Layer.provide(pruneStale),
    Layer.provide(pullRates),
    Layer.provide(pullRecentRates),
    GroupImpl.finalize
);
