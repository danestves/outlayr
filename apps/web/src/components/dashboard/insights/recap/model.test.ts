import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { Doc } from "@outlayr/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../../lib/dashboard-series-ledger";
import { periodOf } from "../../../../lib/dashboard-series-period";
import { recapOf } from "./model";

const NOW = Date.parse("2026-10-20T15:00:00Z");
const scope = { accounts: [] } as const;

const entry = (id: string, iso: string, amount: number, categoryId: string) =>
    ({
        _creationTime: 0,
        _id: id,
        accountId: "a",
        amount,
        amountUsd: amount,
        categoryId,
        currency: "USD",
        date: Date.parse(iso),
        day: Date.parse(iso),
        deletedAt: null,
        income: false,
        localId: id,
        note: "",
        recurringType: 0,
    }) as unknown as Doc<"transactions">;

const category = (id: string) =>
    ({
        _creationTime: 0,
        _id: id,
        color: "#888",
        deletedAt: null,
        income: false,
        localId: id,
        name: id,
        parentId: null,
    }) as unknown as Doc<"categories">;

const budget = (categoryId: string, amount: number) =>
    ({
        _creationTime: 0,
        _id: `b-${categoryId}`,
        amount,
        amountUsd: amount,
        categoryId,
        currency: "USD",
        deletedAt: null,
        green: false,
        localId: `b-${categoryId}`,
        name: null,
        rollover: false,
        startDate: Date.parse("2026-01-01T00:00:00Z"),
        type: 3,
    }) as unknown as Doc<"budgets">;

const books = (transactions: Doc<"transactions">[]): LedgerBooks => ({
    accounts: [],
    appMeta: [{ key: "timeZone", value: "UTC" }],
    budgets: [budget("rent", 1000), budget("shopping", 100)],
    categories: [category("rent"), category("shopping")],
    exchangeRates: [],
    installmentPlans: [],
    installments: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    savingsGoals: [],
    transactions,
    transfers: [],
});

const months = ["05", "06", "07"].flatMap((month) => [
    entry(`rent-${month}`, `2026-${month}-02T12:00:00Z`, 1000, "rent"),
    entry(`shop-${month}`, `2026-${month}-03T12:00:00Z`, 300, "shopping"),
]);

describe("recapOf savings", () => {
    const ledger = prepareLedger(
        books([
            ...months,
            entry("rent-08", "2026-08-02T12:00:00Z", 900, "rent"),
            entry("shop-08", "2026-08-03T12:00:00Z", 130, "shopping"),
        ]),
        NOW
    );
    const { savings } = recapOf(ledger, scope, periodOf("2026-08", 1));

    it("counts the room left under a kept budget", () => {
        expect(savings.budgetsKept).toBe(1);
        expect(savings.underBudgets).toBe(100);
    });

    it("lets an over budget category carry the drop below its usual, but not a kept one", () => {
        expect(savings.drop).toMatchObject({ amount: 170, id: "shopping" });
        expect(savings.kept).toBe(270);
        expect(savings.over).toEqual([{ by: 30, id: "shopping", name: "shopping" }]);
    });

    it("claims no savings for a month that is still open", () => {
        const open = recapOf(ledger, scope, periodOf("2026-10", 1));
        expect(open.savings.kept).toBe(0);
    });
});
