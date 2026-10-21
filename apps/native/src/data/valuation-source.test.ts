import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

import { appMeta, exchangeRates } from "@/db/schema";
import { testSpendDb } from "@/db/test-database";

import type { SpendDb } from "./budget-spent";
import { loadValuation, loadValuationIn } from "./valuation-source";

const NOW = 1_700_000_000_000;
const DAY = "2026-07-28";
const LATER_DAY = "2026-07-29";

function makeDb(): SpendDb {
    const sqlite = new BetterSqlite3(":memory:");
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
    return testSpendDb(sqlite);
}

const OFFICIAL_VES = 45.5;
const BINANCE_VES = 61.25;

async function seed(db: SpendDb): Promise<void> {
    await db.insert(exchangeRates).values([
        {
            date: "2026-07-20",
            fetchedAt: NOW,
            quote: "EUR",
            rate: 0.87,
            rateType: "official",
            source: "frankfurter",
        },
        {
            date: DAY,
            fetchedAt: NOW,
            quote: "EUR",
            rate: 0.86,
            rateType: "official",
            source: "frankfurter",
        },
        {
            date: "2026-07-20",
            fetchedAt: NOW,
            quote: "JPY",
            rate: 155.4,
            rateType: "official",
            source: "frankfurter",
        },
        {
            date: DAY,
            fetchedAt: NOW,
            quote: "JPY",
            rate: 157.1,
            rateType: "official",
            source: "frankfurter",
        },
        {
            date: DAY,
            fetchedAt: NOW,
            quote: "VES",
            rate: OFFICIAL_VES,
            rateType: "official",
            source: "bcv",
        },
        {
            date: LATER_DAY,
            fetchedAt: NOW,
            quote: "VES",
            rate: 52.75,
            rateType: "eur_reference",
            source: "bcv",
        },
        {
            date: LATER_DAY,
            fetchedAt: NOW,
            quote: "VES",
            rate: BINANCE_VES,
            rateType: "binance",
            source: "binance",
        },
        {
            date: "2026-07-10",
            fetchedAt: NOW,
            quote: "VES",
            rate: 58.5,
            rateType: "binance",
            source: "binance",
        },
    ]);
}

describe("loadValuationIn", () => {
    it("answers for a quote nobody has as their display currency", async () => {
        const db = makeDb();
        await seed(db);

        const { displayCurrency, rates } = await loadValuationIn(db, "JPY");

        expect(displayCurrency).toBe("JPY");
        expect(rates.get("JPY", DAY)).toBe(157.1);
        expect(rates.earliest("JPY")).toBe("2026-07-20");
    });

    it("takes only the official rate where a quote carries several types", async () => {
        const db = makeDb();
        await seed(db);

        const { rates } = await loadValuationIn(db, "VES");

        expect(rates.get("VES", LATER_DAY)).toBe(OFFICIAL_VES);
        expect(rates.earliest("VES")).toBe(DAY);
    });
});

describe("loadValuation", () => {
    it("resolves the quote from the stored display currency", async () => {
        const db = makeDb();
        await seed(db);
        await db.insert(appMeta).values({ key: "currency", value: "EUR" });

        const stored = await loadValuation(db);
        const explicit = await loadValuationIn(db, "EUR");

        expect(stored.displayCurrency).toBe(explicit.displayCurrency);
        expect(stored.rates.get("EUR", DAY)).toBe(explicit.rates.get("EUR", DAY));
        expect(stored.rates.earliest("EUR")).toBe(explicit.rates.earliest("EUR"));
        expect(stored.rates.get("EUR", DAY)).toBe(0.86);
    });

    it("falls back to USD when nothing is stored", async () => {
        const db = makeDb();
        await seed(db);

        const { displayCurrency, rates } = await loadValuation(db);

        expect(displayCurrency).toBe("USD");
        expect(rates.earliest("USD")).toBeNull();
    });
});
