import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { budgets, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

const mockIndexItems = vi.fn<(items: { keywords: string[]; uniqueIdentifier: string }[]) => Promise<void>>();
const mockRemoveDomain = vi.fn<(domain: string) => Promise<void>>();
vi.mock("expo-core-spotlight", () => ({
    __esModule: true,
    default: {
        indexItems: (items: { keywords: string[]; uniqueIdentifier: string }[]) => mockIndexItems(items),
        isAvailable: () => Promise.resolve(true),
        removeAllItems: () => Promise.resolve(),
        removeAllItemsFromDomain: (domain: string) => mockRemoveDomain(domain),
    },
}));

import { indexSpotlight as index } from "./spotlight";

const indexSpotlight = (db: Database, now: Date) => Effect.runPromise(index(db, now));

const NOW = new Date("2026-03-04T10:00:00.000Z");

async function seed(db: Database, amount: number, currency: string): Promise<void> {
    await db.insert(transactions).values({
        accountId: "acct-1",
        amount,
        amountUsd: amount,
        currency,
        date: NOW,
        day: NOW,
        id: `tx-${currency}`,
        income: false,
        month: NOW,
        note: "Bakery",
        updatedAt: NOW,
    });
}

/** The keywords of the one indexed transaction. */
function keywords(): string[] {
    const items = mockIndexItems.mock.calls.flatMap(([batch]) => batch);
    const entry = items.find((item) => item.uniqueIdentifier.includes("tx-"));
    return entry?.keywords ?? [];
}

describe("spotlight transaction keywords", () => {
    beforeEach(() => {
        mockIndexItems.mockReset();
        mockIndexItems.mockResolvedValue();
        mockRemoveDomain.mockReset();
        mockRemoveDomain.mockResolvedValue();
    });

    it("indexes the amount the way the Log prints it, padded to the currency's minor units", async () => {
        // `transactions.amount` is major units, so this is stored as 12.4 and
        // `String(amount)` would index "12.4", which the figure on the row it
        // deep-links to, "€12.40", never matches.
        const db = migratedDatabase({ foreignKeys: false });
        await seed(db, 12.4, "EUR");

        await indexSpotlight(db, NOW);

        expect(keywords()).toContain("12.40");
    });

    it("pads to zero decimals for a currency that has none", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await seed(db, 1200, "JPY");

        await indexSpotlight(db, NOW);

        expect(keywords()).toContain("1200");
    });

    it("carries the active language's kind, not every language's", () => {
        // The index is rebuilt on every launch and every background, and the
        // language row hands the user to iOS Settings, which terminates the app,
        // so a second language in here is never the one being typed.
        const db = migratedDatabase({ foreignKeys: false });

        return seed(db, 5, "USD")
            .then(() => indexSpotlight(db, NOW))
            .then(() => {
                expect(keywords()).toContain("Expense");
                expect(keywords()).not.toContain("Gasto");
            });
    });

    it("swallows a failed index, so it never takes down the write that triggered it", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await seed(db, 5, "USD");
        mockIndexItems.mockRejectedValue(new Error("index unavailable"));

        await expect(indexSpotlight(db, NOW)).resolves.toBeUndefined();
    });

    it("lets the budgets half finish when the transactions half fails", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await seed(db, 5, "USD");
        await db.insert(budgets).values({ amount: 100, id: "budget-1", type: 0, updatedAt: NOW });
        mockRemoveDomain.mockImplementation((domain) =>
            domain === "budgets"
                ? new Promise<void>((resolve) => {
                      setTimeout(resolve, 0);
                  })
                : Promise.resolve()
        );
        mockIndexItems.mockImplementation((items) =>
            items.some((item) => item.uniqueIdentifier.includes("tx-"))
                ? Promise.reject(new Error("index unavailable"))
                : Promise.resolve()
        );

        await indexSpotlight(db, NOW);

        const indexed = mockIndexItems.mock.calls.flatMap(([batch]) => batch.map((item) => item.uniqueIdentifier));
        expect(indexed.some((id) => id.includes("budget-1"))).toBe(true);
    });
});
