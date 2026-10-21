import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

import type { Database } from "@/db/client";
import { appMeta, exchangeRates } from "@/db/schema";
import { testDatabase, withAsyncTransactions } from "@/db/test-database";
import { chunkRows } from "@/lib/chunk";

import { applyRecentRates, isThrottled, pullRatesIfDue, RATE_ROWS_PER_CHUNK, RATES_THROTTLE_MS } from "./rates";
import type { PullRatesPage, RateWireRow } from "./rates";
import { ratesRevision, subscribeRatesRevision } from "./rates-revision";

describe("chunkRows", () => {
    it("splits into contiguous chunks with a possibly short tail", () => {
        expect(chunkRows([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
    });

    it("returns nothing for an empty input", () => {
        expect(chunkRows([], 10)).toStrictEqual([]);
    });
});

describe("isThrottled", () => {
    const now = 1_700_000_000_000;

    it("holds inside the window and opens on its edge", () => {
        expect(isThrottled(now - 1, now)).toBe(true);
        expect(isThrottled(now - RATES_THROTTLE_MS + 1, now)).toBe(true);
        expect(isThrottled(now - RATES_THROTTLE_MS, now)).toBe(false);
    });

    it("treats a backward clock jump as expired rather than locking shut", () => {
        expect(isThrottled(now + 60_000, now)).toBe(false);
    });
});

function makeDb(): Database {
    const sqlite = new BetterSqlite3(":memory:");
    withAsyncTransactions(sqlite);
    sqlite.exec(`
		CREATE TABLE appMeta (
			key text PRIMARY KEY NOT NULL,
			value text
		);
		CREATE TABLE exchangeRates (
			quote text NOT NULL,
			rateType text NOT NULL,
			date text NOT NULL,
			rate real NOT NULL,
			source text NOT NULL,
			fetchedAt integer NOT NULL,
			PRIMARY KEY (quote, rateType, date)
		);
	`);
    return testDatabase(sqlite);
}

const NOW = 1_700_000_000_000;

function wireRow(quote: string, date: string): RateWireRow {
    return {
        date,
        fetchedAt: NOW,
        quote,
        rate: 0.9,
        rateType: "official",
        source: "frankfurter",
    };
}

function pagedPuller(pages: RateWireRow[][]): {
    pull: (args?: { cursor?: number }) => Promise<PullRatesPage>;
    calls: (number | undefined)[];
} {
    const calls: (number | undefined)[] = [];
    return {
        calls,
        pull: async (args) => {
            const index = args?.cursor ?? 0;
            calls.push(args?.cursor);
            return {
                nextCursor: index + 1 < pages.length ? index + 1 : null,
                rows: pages[index] ?? [],
                windowStart: "2026-01-01",
            };
        },
    };
}

async function storedRates(db: Database): Promise<{ quote: string; date: string }[]> {
    return await db
        .select({ date: exchangeRates.date, quote: exchangeRates.quote })
        .from(exchangeRates)
        .orderBy(exchangeRates.quote);
}

async function lastPullAt(db: Database): Promise<string | null> {
    const rows = await db.select().from(appMeta);
    return rows[0]?.value ?? null;
}

describe("pullRatesIfDue", () => {
    it("holds inside the throttle window without asking the backend", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "lastRatesPullAt", value: String(NOW - 1000) });
        let asked = 0;
        const landed = await pullRatesIfDue(
            db,
            async () => {
                asked += 1;
                return { nextCursor: null, rows: [], windowStart: "2026-01-01" };
            },
            { now: NOW }
        );

        expect(landed).toBe(false);
        expect(asked).toBe(0);
    });

    it("force ignores a stamp that has not aged out", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "lastRatesPullAt", value: String(NOW - 1000) });
        const { pull } = pagedPuller([[wireRow("EUR", "2026-07-28")]]);

        await expect(pullRatesIfDue(db, pull, { force: true, now: NOW })).resolves.toBe(true);
        await expect(storedRates(db)).resolves.toHaveLength(1);
    });

    it("walks every page the cursor offers", async () => {
        const db = makeDb();
        const { pull, calls } = pagedPuller([
            [wireRow("EUR", "2026-07-26")],
            [wireRow("GBP", "2026-07-27")],
            [wireRow("JPY", "2026-07-28")],
        ]);

        await expect(pullRatesIfDue(db, pull, { now: NOW })).resolves.toBe(true);
        expect(calls).toStrictEqual([undefined, 1, 2]);
        expect((await storedRates(db)).map((row) => row.quote)).toStrictEqual(["EUR", "GBP", "JPY"]);
    });

    it("writes a snapshot too large for one insert", async () => {
        const db = makeDb();
        const oversized = Array.from({ length: 6000 }, (_, index) => wireRow(`Q${index}`, "2026-07-28"));
        const { pull } = pagedPuller([oversized]);

        await expect(pullRatesIfDue(db, pull, { now: NOW })).resolves.toBe(true);
        await expect(storedRates(db)).resolves.toHaveLength(6000);
    });

    it("replaces the whole cache rather than merging into it", async () => {
        const db = makeDb();
        await db.insert(exchangeRates).values(wireRow("VES", "2020-01-01"));
        const { pull } = pagedPuller([[wireRow("EUR", "2026-07-28")]]);

        await pullRatesIfDue(db, pull, { now: NOW });
        await expect(storedRates(db)).resolves.toStrictEqual([{ date: "2026-07-28", quote: "EUR" }]);
    });

    it("re-stamps over a previous pull rather than conflicting", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "lastRatesPullAt", value: String(NOW - 1) });
        const { pull } = pagedPuller([[wireRow("EUR", "2026-07-28")]]);

        await pullRatesIfDue(db, pull, { force: true, now: NOW });
        await expect(lastPullAt(db)).resolves.toBe(String(NOW));
    });

    it("keeps a stale cache rather than emptying it on an empty snapshot", async () => {
        const db = makeDb();
        await db.insert(exchangeRates).values(wireRow("VES", "2020-01-01"));
        const { pull } = pagedPuller([[]]);

        await expect(pullRatesIfDue(db, pull, { now: NOW })).resolves.toBe(false);
        await expect(storedRates(db)).resolves.toHaveLength(1);
        await expect(lastPullAt(db)).resolves.toBeNull();
    });

    it("rolls the wipe back when the replacement fails part-way", async () => {
        const db = makeDb();
        await db.insert(exchangeRates).values(wireRow("VES", "2020-01-01"));
        const duplicate = wireRow("EUR", "2026-07-28");
        const { pull } = pagedPuller([[duplicate, duplicate]]);
        const before = ratesRevision();

        // `toMatchObject`, not `.rejects.toThrow()`: the native `SqliteError` comes from another realm, so `toThrow()`
        // can report "did not throw".
        await expect(pullRatesIfDue(db, pull, { now: NOW })).rejects.toMatchObject({
            message: expect.any(String),
        });
        await expect(storedRates(db)).resolves.toStrictEqual([{ date: "2020-01-01", quote: "VES" }]);
        await expect(lastPullAt(db)).resolves.toBeNull();
        expect(ratesRevision()).toBe(before);
    });

    it("bumps only once the replaced cache is readable", async () => {
        const db = makeDb();
        await db.insert(exchangeRates).values(wireRow("VES", "2020-01-01"));
        const { pull } = pagedPuller([[wireRow("EUR", "2026-07-28")]]);
        let atBump: { quote: string; date: string }[] = [];
        const unsubscribe = subscribeRatesRevision(() => {
            atBump = db
                .select({ date: exchangeRates.date, quote: exchangeRates.quote })
                .from(exchangeRates)
                .orderBy(exchangeRates.quote)
                .all();
        });

        await pullRatesIfDue(db, pull, { now: NOW });
        unsubscribe();
        expect(atBump).toStrictEqual([{ date: "2026-07-28", quote: "EUR" }]);
    });

    it("does not bump when the replacement rolls back", async () => {
        const db = makeDb();
        await db.insert(exchangeRates).values(wireRow("VES", "2020-01-01"));
        const rows = Array.from({ length: RATE_ROWS_PER_CHUNK + 1 }, (_, index) =>
            wireRow(index === RATE_ROWS_PER_CHUNK ? "Q0" : `Q${index}`, "2026-07-28")
        );
        const { pull } = pagedPuller([rows]);
        const before = ratesRevision();

        await expect(pullRatesIfDue(db, pull, { now: NOW })).rejects.toThrow();

        expect(ratesRevision()).toBe(before);
        await expect(storedRates(db)).resolves.toStrictEqual([{ date: "2020-01-01", quote: "VES" }]);
    });
});

describe("applyRecentRates", () => {
    it("updates today's rate in place and leaves earlier days alone", async () => {
        const db = makeDb();
        await db.insert(exchangeRates).values([wireRow("EUR", "2026-07-27"), wireRow("EUR", "2026-07-28")]);
        const before = ratesRevision();

        const landed = await applyRecentRates(db, [
            { ...wireRow("EUR", "2026-07-28"), rate: 0.88 },
            wireRow("GBP", "2026-07-28"),
        ]);

        expect(landed).toBe(true);
        expect(ratesRevision()).toBe(before + 1);
        await expect(
            db
                .select({ date: exchangeRates.date, quote: exchangeRates.quote, rate: exchangeRates.rate })
                .from(exchangeRates)
                .orderBy(exchangeRates.quote, exchangeRates.date)
        ).resolves.toStrictEqual([
            { date: "2026-07-27", quote: "EUR", rate: 0.9 },
            { date: "2026-07-28", quote: "EUR", rate: 0.88 },
            { date: "2026-07-28", quote: "GBP", rate: 0.9 },
        ]);
    });

    it("bumps once for the same delivery applied twice", async () => {
        const db = makeDb();
        const delivery = [wireRow("EUR", "2026-07-27"), wireRow("EUR", "2026-07-28")];
        const before = ratesRevision();

        await expect(applyRecentRates(db, delivery)).resolves.toBe(true);
        await expect(applyRecentRates(db, delivery)).resolves.toBe(false);
        expect(ratesRevision()).toBe(before + 1);
    });

    it("writes the one rate that moved in an otherwise repeated delivery", async () => {
        const db = makeDb();
        const eur = wireRow("EUR", "2026-07-28");
        await applyRecentRates(db, [eur, wireRow("GBP", "2026-07-28")]);
        const before = ratesRevision();

        await expect(applyRecentRates(db, [eur, { ...wireRow("GBP", "2026-07-28"), rate: 0.85 }])).resolves.toBe(true);
        expect(ratesRevision()).toBe(before + 1);
        await expect(
            db
                .select({ quote: exchangeRates.quote, rate: exchangeRates.rate })
                .from(exchangeRates)
                .orderBy(exchangeRates.quote)
        ).resolves.toStrictEqual([
            { quote: "EUR", rate: 0.9 },
            { quote: "GBP", rate: 0.85 },
        ]);
    });

    it("takes a re-stamped fetch time without bumping when the rate held", async () => {
        const db = makeDb();
        await applyRecentRates(db, [wireRow("EUR", "2026-07-28")]);
        const before = ratesRevision();

        await expect(
            applyRecentRates(db, [{ ...wireRow("EUR", "2026-07-28"), fetchedAt: NOW + 3_600_000 }])
        ).resolves.toBe(false);
        expect(ratesRevision()).toBe(before);
        await expect(db.select({ fetchedAt: exchangeRates.fetchedAt }).from(exchangeRates)).resolves.toStrictEqual([
            { fetchedAt: NOW + 3_600_000 },
        ]);
    });
});
