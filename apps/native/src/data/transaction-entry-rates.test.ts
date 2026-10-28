import { describe, expect, it } from "vite-plus/test";

import { exchangeRates, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { transactionRateSuggestions } from "./transaction-entry-rates";

const makeDb = migratedDatabase;

const SELECTED_DATE = new Date("2026-08-10T12:00:00.000Z");

function customRow(
    id: string,
    date: string,
    overrides: Partial<typeof transactions.$inferInsert> = {}
): typeof transactions.$inferInsert {
    const instant = new Date(date);
    return {
        amount: 100,
        currency: "VES",
        date: instant,
        day: instant,
        exchangeRate: 55.5,
        exchangeRateType: "custom",
        id,
        income: false,
        month: instant,
        note: "Custom rate",
        updatedAt: instant,
        ...overrides,
    };
}

describe("transactionRateSuggestions", () => {
    it("suggests the newest official and EUR-reference rows on or before the transaction date", () => {
        const db = makeDb();
        db.insert(exchangeRates)
            .values([
                {
                    date: "2026-08-08",
                    fetchedAt: 1,
                    quote: "VES",
                    rate: 40,
                    rateType: "official",
                    source: "provider",
                },
                {
                    date: "2026-08-10",
                    fetchedAt: 2,
                    quote: "VES",
                    rate: 42,
                    rateType: "official",
                    source: "provider",
                },
                {
                    date: "2026-08-11",
                    fetchedAt: 3,
                    quote: "VES",
                    rate: 43,
                    rateType: "official",
                    source: "provider",
                },
                {
                    date: "2026-08-09",
                    fetchedAt: 4,
                    quote: "VES",
                    rate: 50,
                    rateType: "eur_reference",
                    source: "provider",
                },
            ])
            .run();

        expect(transactionRateSuggestions(db, "VES", SELECTED_DATE)).toStrictEqual({
            eurReference: 50,
            eurReferenceDate: "2026-08-09",
            eurReferenceFetchedAt: 4,
            official: 42,
            officialDate: "2026-08-10",
            officialFetchedAt: 2,
            priorCustom: null,
        });
    });

    it("never suggests EUR-reference outside VES", () => {
        const db = makeDb();
        db.insert(exchangeRates)
            .values({
                date: "2026-08-10",
                fetchedAt: 1,
                quote: "EUR",
                rate: 0.9,
                rateType: "eur_reference",
                source: "provider",
            })
            .run();

        expect(transactionRateSuggestions(db, "EUR", SELECTED_DATE).eurReference).toBeNull();
    });

    it("suggests the latest earlier positive custom transaction rate for the same currency", () => {
        const db = makeDb();
        db.insert(transactions)
            .values([
                customRow("older", "2026-08-01T12:00:00.000Z", { exchangeRate: 48 }),
                customRow("latest", "2026-08-09T12:00:00.000Z", { exchangeRate: 55.5 }),
            ])
            .run();

        expect(transactionRateSuggestions(db, "VES", SELECTED_DATE).priorCustom).toStrictEqual({
            date: new Date("2026-08-09T12:00:00.000Z"),
            rate: 55.5,
        });
    });

    it("breaks equal transaction-date ties by the persisted transaction id", () => {
        const db = makeDb();
        db.insert(transactions)
            .values([
                customRow("custom-a", "2026-08-09T12:00:00.000Z", { exchangeRate: 48 }),
                customRow("custom-z", "2026-08-09T12:00:00.000Z", { exchangeRate: 55.5 }),
            ])
            .run();

        expect(transactionRateSuggestions(db, "VES", SELECTED_DATE).priorCustom).toStrictEqual({
            date: new Date("2026-08-09T12:00:00.000Z"),
            rate: 55.5,
        });
    });

    it("ignores future deleted zero and other-currency custom rows", () => {
        const db = makeDb();
        db.insert(transactions)
            .values([
                customRow("valid", "2026-08-01T12:00:00.000Z", { exchangeRate: 48 }),
                customRow("future", "2026-08-11T12:00:00.000Z", { exchangeRate: 70 }),
                customRow("deleted", "2026-08-09T12:00:00.000Z", {
                    deletedAt: new Date("2026-08-10T00:00:00.000Z"),
                    exchangeRate: 60,
                }),
                customRow("zero", "2026-08-08T12:00:00.000Z", { exchangeRate: 0 }),
                customRow("other", "2026-08-09T12:00:00.000Z", { currency: "EUR", exchangeRate: 0.9 }),
            ])
            .run();

        expect(transactionRateSuggestions(db, "VES", SELECTED_DATE).priorCustom).toStrictEqual({
            date: new Date("2026-08-01T12:00:00.000Z"),
            rate: 48,
        });
    });
});
