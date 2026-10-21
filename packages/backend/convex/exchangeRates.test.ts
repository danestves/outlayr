/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { nextPruneStep, RATES_WINDOW_DAYS } from "./exchangeRates";
import type { MarketRateType, RateSource } from "./lib/currencies";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

type TestClient = TestConvex<typeof schema>;

afterEach(() => {
    vi.useRealTimers();
});

interface SeedRate {
    date: string;
    fetchedAt: number;
    quote: string;
    rate: number;
    rateType: MarketRateType;
    source: RateSource;
}

function seed(t: TestClient, row: SeedRate): Promise<unknown> {
    return t.run((ctx) => ctx.db.insert("exchangeRates", row));
}

function readKey(t: TestClient, quote: string, rateType: MarketRateType, date: string) {
    return t.run((ctx) =>
        ctx.db
            .query("exchangeRates")
            .withIndex("by_quote_and_rateType_and_date", (q) =>
                q.eq("quote", quote).eq("rateType", rateType).eq("date", date)
            )
            .collect()
    );
}

describe("upsertRates", () => {
    it("re-running the same key patches the row in place, never duplicates", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(internal.exchangeRates.upsertRates, {
            date: "2026-03-13",
            fetchedAt: 1000,
            rates: [{ quote: "VES", rate: 40, rateType: "official" }],
            source: "frankfurter",
        });
        await t.mutation(internal.exchangeRates.upsertRates, {
            date: "2026-03-13",
            fetchedAt: 2000,
            rates: [{ quote: "VES", rate: 41, rateType: "official" }],
            source: "frankfurter",
        });

        const rows = await readKey(t, "VES", "official", "2026-03-13");
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            fetchedAt: 2000,
            rate: 41,
            source: "frankfurter",
        });
    });

    it("open exchange rates never overwrites a same-key cotizave row", async () => {
        const t = convexTest(schema, modules);
        await seed(t, {
            date: "2026-03-13",
            fetchedAt: 500,
            quote: "VES",
            rate: 38.5,
            rateType: "official",
            source: "cotizave",
        });

        await t.mutation(internal.exchangeRates.upsertRates, {
            date: "2026-03-13",
            fetchedAt: 1000,
            rates: [{ quote: "VES", rate: 40, rateType: "official" }],
            source: "openexchangerates",
        });

        const rows = await readKey(t, "VES", "official", "2026-03-13");
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            fetchedAt: 500,
            rate: 38.5,
            source: "cotizave",
        });
    });

    it("cotizave overwrites a same-key frankfurter row", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(internal.exchangeRates.upsertRates, {
            date: "2026-03-13",
            fetchedAt: 500,
            rates: [{ quote: "VES", rate: 40, rateType: "official" }],
            source: "frankfurter",
        });

        await t.mutation(internal.exchangeRates.upsertRates, {
            date: "2026-03-13",
            fetchedAt: 1000,
            rates: [{ quote: "VES", rate: 38.5, rateType: "official" }],
            source: "cotizave",
        });

        const rows = await readKey(t, "VES", "official", "2026-03-13");
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            fetchedAt: 1000,
            rate: 38.5,
            source: "cotizave",
        });
    });

    it("drops non-positive and non-finite rates, upserts the valid subset", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(internal.exchangeRates.upsertRates, {
            date: "2026-03-13",
            fetchedAt: 1000,
            rates: [
                { quote: "AAA", rate: 0, rateType: "official" },
                { quote: "BBB", rate: -5, rateType: "official" },
                { quote: "CCC", rate: Number.POSITIVE_INFINITY, rateType: "official" },
                { quote: "DDD", rate: Number.NaN, rateType: "official" },
                { quote: "EUR", rate: 0.92, rateType: "official" },
            ],
            source: "frankfurter",
        });

        const all = await t.run((ctx) => ctx.db.query("exchangeRates").collect());
        expect(all).toHaveLength(1);
        expect(all[0]).toMatchObject({ quote: "EUR", rate: 0.92 });
    });
});

const MS_PER_DAY = 86_400_000;

function daysAgoDate(days: number): string {
    return new Date(Date.now() - days * MS_PER_DAY).toISOString().slice(0, 10);
}

function seedOfficialRate(t: TestClient, quote: string, date: string): Promise<unknown> {
    return seed(t, {
        date,
        fetchedAt: 1000,
        quote,
        rate: 40,
        rateType: "official",
        source: "frankfurter",
    });
}

function allRateDates(t: TestClient, quote: string): Promise<string[]> {
    return t.run(async (ctx) => {
        const rows = await ctx.db
            .query("exchangeRates")
            .withIndex("by_quote_and_rateType_and_date", (q) => q.eq("quote", quote).eq("rateType", "official"))
            .collect();
        return rows.map((row) => row.date).sort();
    });
}

async function runPruneToCompletion(t: TestClient): Promise<void> {
    await t.action(internal.exchangeRates.pruneStale, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
}

async function seedPreWindowBacklog(t: TestClient, quote: string): Promise<void> {
    for (let days = 91; days <= 340; days += 1) {
        await seedOfficialRate(t, quote, daysAgoDate(days));
    }
}

describe("pruneStale", () => {
    it("keeps one pre-window row per month and every in-window row", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedOfficialRate(t, "VES", daysAgoDate(5));
        await seedOfficialRate(t, "VES", daysAgoDate(100));
        await seedOfficialRate(t, "VES", daysAgoDate(120));
        await seedOfficialRate(t, "VES", daysAgoDate(200));

        await runPruneToCompletion(t);

        await expect(allRateDates(t, "VES")).resolves.toStrictEqual(
            [daysAgoDate(200), daysAgoDate(100), daysAgoDate(5)].sort()
        );
    });

    it("keeps the monthly anchors of non-catalog pairs too", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedOfficialRate(t, "XXX", daysAgoDate(100));
        await seedOfficialRate(t, "XXX", daysAgoDate(200));

        await runPruneToCompletion(t);

        await expect(allRateDates(t, "XXX")).resolves.toStrictEqual([daysAgoDate(200), daysAgoDate(100)].sort());
    });

    it("completes across self-scheduled batches when stale rows exceed one batch", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedPreWindowBacklog(t, "VES");

        await runPruneToCompletion(t);

        const survivors = await allRateDates(t, "VES");
        expect(survivors).toContain(daysAgoDate(91));
        expect(new Set(survivors.map((date) => date.slice(0, 7))).size).toBe(survivors.length);
        expect(survivors.length).toBeLessThan(12);
    });

    it("a pass started before a clock advance keeps pruning against its original boundary", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        // Captured before the clock moves: daysAgoDate is relative to Date.now().
        const nearBoundaryInWindow = [daysAgoDate(89), daysAgoDate(88)];
        const originalAnchor = daysAgoDate(91);
        await seedOfficialRate(t, "VES", nearBoundaryInWindow[0]);
        await seedOfficialRate(t, "VES", nearBoundaryInWindow[1]);
        await seedPreWindowBacklog(t, "VES");

        const first = await t.action(internal.exchangeRates.pruneStale, {});
        expect(first.isDone).toBeFalsy();
        // Past the original boundary, a per-batch windowStart recompute would delete the original pass's anchor.
        vi.setSystemTime(new Date("2026-07-06T12:00:00Z"));
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        const survivors = await allRateDates(t, "VES");
        expect(survivors).toContain(originalAnchor);
        for (const date of nearBoundaryInWindow) {
            expect(survivors).toContain(date);
        }
        expect(new Set(survivors.map((date) => date.slice(0, 7))).size).toBe(
            new Set(survivors.filter((date) => date < originalAnchor).map((date) => date.slice(0, 7))).size + 1
        );
    });

    it("a second pass after a completed prune deletes nothing", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedPreWindowBacklog(t, "VES");
        await runPruneToCompletion(t);
        const survivors = await allRateDates(t, "VES");

        const second = await t.action(internal.exchangeRates.pruneStale, {});
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        expect(second).toStrictEqual({ deleted: 0, isDone: true });
        await expect(allRateDates(t, "VES")).resolves.toStrictEqual(survivors);
    });

    it("spaces the next batch out instead of dispatching it immediately", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedPreWindowBacklog(t, "VES");

        await t.action(internal.exchangeRates.pruneStale, {});

        const pending = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(pending).toHaveLength(1);
        expect(pending[0]?.scheduledTime).toBeGreaterThan(Date.now());
    });

    it("pullRates floors a caller's instant so the window read stays bounded", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);

        const epoch = await t.query(api.exchangeRates.pullRates, { at: 0 });

        expect(epoch.windowStart).toBe(daysAgoDate(3 * RATES_WINDOW_DAYS));
    });

    it("pullRates slices on the caller's instant, not the server's clock", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedOfficialRate(t, "VES", daysAgoDate(10));

        const ahead = await t.query(api.exchangeRates.pullRates, {
            at: Date.now() + 400 * 24 * 60 * 60 * 1000,
        });

        expect(ahead.windowStart.localeCompare(daysAgoDate(10))).toBeGreaterThan(0);
    });

    it("pullRates still serves the anchor after GC", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedOfficialRate(t, "VES", daysAgoDate(10));
        await seedOfficialRate(t, "VES", daysAgoDate(100));
        await seedOfficialRate(t, "VES", daysAgoDate(200));

        await runPruneToCompletion(t);
        const result = await t.query(api.exchangeRates.pullRates, {});

        const dates = result.rows.filter((r) => r.quote === "VES").map((r) => r.date);
        expect(dates).toHaveLength(3);
        expect(dates).toContain(daysAgoDate(10));
        expect(dates).toContain(daysAgoDate(100));
        expect(dates).toContain(daysAgoDate(200));
    });
});

describe("pullRecentRates", () => {
    it("serves the catalog rows from the caller's previous UTC day onward", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const t = convexTest(schema, modules);
        await seedOfficialRate(t, "EUR", daysAgoDate(0));
        await seedOfficialRate(t, "EUR", daysAgoDate(1));
        await seedOfficialRate(t, "EUR", daysAgoDate(2));
        await seedOfficialRate(t, "BTC", daysAgoDate(0));

        const rows = await t.query(api.exchangeRates.pullRecentRates, { at: Date.now() });

        const served = rows.map((row) => `${row.quote} ${row.date}`);
        expect(served).toHaveLength(2);
        expect(served).toContain(`EUR ${daysAgoDate(0)}`);
        expect(served).toContain(`EUR ${daysAgoDate(1)}`);
    });
});

describe(nextPruneStep, () => {
    const midPass = { cursor: "page-3", retries: 0 };

    it("carries a drained batch on to the next page", () => {
        expect(nextPruneStep({ cursor: "page-4", failed: false, isDone: false }, midPass)).toMatchObject({
            cursor: "page-4",
            retries: 0,
        });
    });

    it("a failed batch keeps the pass alive at the same cursor", () => {
        expect(nextPruneStep({ failed: true }, midPass)).toMatchObject({ cursor: "page-3", retries: 1 });
    });

    it("backs off further on each consecutive failure", () => {
        const first = nextPruneStep({ failed: true }, midPass);
        const second = nextPruneStep({ failed: true }, { cursor: "page-3", retries: first?.retries ?? 0 });
        expect(second?.delayMs).toBeGreaterThan(first?.delayMs ?? 0);
    });

    it("gives up on a batch that keeps failing, leaving the rest to the daily cron", () => {
        let step = nextPruneStep({ failed: true }, midPass);
        for (let attempt = 0; attempt < 20 && step; attempt += 1) {
            step = nextPruneStep({ failed: true }, { cursor: step.cursor, retries: step.retries });
        }
        expect(step).toBeNull();
    });

    it("a success clears the retries a stuck batch accrued", () => {
        expect(
            nextPruneStep({ cursor: "page-4", failed: false, isDone: false }, { cursor: "page-3", retries: 3 })
        ).toMatchObject({ retries: 0 });
    });
});
