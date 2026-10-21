import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

const mockIndexItems = jest.fn<(items: { keywords: string[]; uniqueIdentifier: string }[]) => Promise<void>>();
jest.mock("expo-core-spotlight", () => ({
    __esModule: true,
    default: {
        indexItems: (items: { keywords: string[]; uniqueIdentifier: string }[]) => mockIndexItems(items),
        isAvailable: () => Promise.resolve(true),
        removeAllItems: () => Promise.resolve(),
        removeAllItemsFromDomain: () => Promise.resolve(),
    },
}));

import { indexSpotlight } from "./spotlight";

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
});
