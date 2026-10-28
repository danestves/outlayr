// @vitest-environment jsdom
import { buildRateTable } from "@outlayr/money/valuation";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { useInsights } from "./use-insights";

const mockUseValuation = vi.fn();

vi.mock<Partial<typeof import("@/i18n/context")>>(import("@/i18n/context"), () => ({
    useLanguage: () => ({ language: "en" }),
}));

vi.mock("./use-valuation", () => ({
    useValuation: () => mockUseValuation(),
}));

const NOW = new Date(Date.UTC(2026, 6, 15, 12));

const makeDb = migratedDatabase;

async function seedPendingCustom(db: Database): Promise<void> {
    await db.insert(categories).values({ id: "food", income: false, name: "Food", updatedAt: NOW });
    await db.insert(transactions).values({
        amount: 40,
        amountUsd: null,
        categoryId: "food",
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

describe("useInsights pending custom valuation", () => {
    it("excludes pending custom from a foreign-currency screen total", async () => {
        const db = makeDb();
        await seedPendingCustom(db);
        mockUseValuation.mockReturnValue({ displayCurrency: "EUR", rates: buildRateTable([]) });

        const { result, unmount } = await renderHook(() => useInsights(db, NOW.getTime(), "month", "spent"));

        expect(result.current.rows).toHaveLength(1);
        expect(result.current.rows[0]?.amount).toBe(0);
        expect(result.current.spent).toBe(0);
        await unmount();
    });
});
