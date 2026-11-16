// @vitest-environment jsdom
import { buildRateTable } from "@outlayr/money/valuation";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { logPeriodStart, previousPeriodWindow, useSparklineRows } from "./log-totals";

const NOW = new Date(Date.UTC(2026, 6, 15, 12));

const makeDb = migratedDatabase;

async function seedPendingCustom(db: Database): Promise<void> {
    await db.insert(transactions).values({
        amount: 40,
        amountUsd: null,
        currency: "VES",
        date: NOW,
        day: NOW,
        exchangeRate: null,
        exchangeRateType: "custom",
        id: "pending-custom",
        income: false,
        month: NOW,
        updatedAt: NOW,
    });
}

async function sparklineAmounts(db: Database, displayCurrency: string): Promise<number[]> {
    const { result, unmount } = await renderHook(() =>
        useSparklineRows(db, NOW.getTime(), true, false, null, displayCurrency, buildRateTable([]))
    );
    const amounts = result.current.map((row) => row.amount);
    await unmount();
    return amounts;
}

describe("useSparklineRows pending custom valuation", () => {
    it("charts zero instead of face value when the sparkline uses a foreign currency", async () => {
        const db = makeDb();
        await seedPendingCustom(db);

        await expect(sparklineAmounts(db, "EUR")).resolves.toStrictEqual([0]);
    });
});

describe("the week the header totals", () => {
    const SUNDAY = new Date(2025, 8, 14, 12, 0, 0);

    it("starts on Monday when the setting says Monday", () => {
        expect(logPeriodStart("week", SUNDAY, 2)).toStrictEqual(new Date(2025, 8, 8));
    });
});

describe("the span the head's trend compares against", () => {
    it("cuts last week at the same weekday and hour", () => {
        const wednesday = new Date(2026, 10, 18, 15, 30);
        const window = previousPeriodWindow("week", wednesday, 1);

        expect(window?.start).toStrictEqual(new Date(2026, 10, 8));
        expect(window?.end).toStrictEqual(new Date(2026, 10, 11, 15, 30));
    });

    it("stops at the end of a shorter month instead of running into this one", () => {
        const window = previousPeriodWindow("month", new Date(2026, 2, 31, 9), 1);

        expect(window?.start).toStrictEqual(new Date(2026, 1, 1));
        expect(window?.end.getTime()).toBe(new Date(2026, 2, 1).getTime() - 1);
    });
});
