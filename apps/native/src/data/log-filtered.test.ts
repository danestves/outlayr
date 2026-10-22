import { describe, expect, it } from "@jest/globals";
import { RECURRING_TYPE, landingDate } from "@outlayr/money/recurrence";

import type { TransactionWithCategory } from "./transactions";

const at = (year: number, month: number, day: number, hour = 0): Date => new Date(year, month - 1, day, hour);

function carrier(overrides: Partial<TransactionWithCategory> & { date: Date }): TransactionWithCategory {
    return {
        amount: 9.99,
        amountUsd: 9.99,
        categoryColor: null,
        categoryEmoji: null,
        categoryIcon: null,
        categoryId: null,
        categoryName: null,
        currency: "USD",
        customColor: null,
        day: new Date(overrides.date.getFullYear(), overrides.date.getMonth(), overrides.date.getDate()),
        emoji: null,
        exchangeRate: null,
        exchangeRateType: null,
        feeForId: null,
        icon: null,
        id: "carrier",
        imageColor: null,
        imageUri: null,
        income: false,
        installmentId: null,
        note: "Netflix",
        recurringAnchorDay: null,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: RECURRING_TYPE.monthly,
        transferId: null,
        ...overrides,
    };
}

describe("landingDate", () => {
    it("advances from the day the chain was written for, not the short month it was clamped into", () => {
        // 31 Jan monthly, clamped to 28 Feb by the backfill, which recorded the
        // anchor it was clamped from. March has a 31st, so the charge goes back.
        const row = carrier({ date: at(2025, 2, 28, 9), recurringAnchorDay: 31 });

        expect(landingDate(row, at(2025, 3, 5))).toStrictEqual(at(2025, 3, 31));
    });

    it("keeps a charge still in the future as its own landing", () => {
        const row = carrier({ date: at(2025, 3, 20, 9) });

        expect(landingDate(row, at(2025, 3, 5))).toStrictEqual(at(2025, 3, 20, 9));
    });

    it("projects from the instant's own day, not the day a peer in another zone stored", () => {
        // What a row written a zone ahead looks like here: `day` reads as the
        // 14th while the charge itself happened on the 15th.
        const row = carrier({ date: at(2025, 3, 15, 9), day: at(2025, 3, 14) });

        expect(landingDate(row, at(2025, 3, 20))).toStrictEqual(at(2025, 4, 15));
    });
});
