import type { Doc } from "@outlayr/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vite-plus/test";

import type { LedgerBooks } from "@/lib/ledger-books";

import { prepareLedger } from "../../../../lib/dashboard-series-ledger";
import { periodOf } from "../../../../lib/dashboard-series-period";
import { axisFor, baselineOf, flowsOf, splitByTag, weeksOf } from "./model";

const NOW = Date.parse("2026-10-20T15:00:00Z");

const entry = (localId: string, iso: string, amount: number) =>
    ({
        _creationTime: 0,
        _id: localId,
        accountId: "a",
        amount,
        amountUsd: amount,
        categoryId: null,
        currency: "USD",
        date: Date.parse(iso),
        day: Date.parse(iso),
        deletedAt: null,
        income: false,
        localId,
        note: "",
        recurringType: 0,
    }) as unknown as Doc<"transactions">;

const books = (transactions: Doc<"transactions">[]): LedgerBooks => ({
    accounts: [],
    appMeta: [{ key: "timeZone", value: "UTC" }],
    budgets: [],
    categories: [],
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

const ledger = prepareLedger(
    books([entry("sep", "2026-09-25T12:00:00Z", 100), entry("oct", "2026-10-02T12:00:00Z", 50)]),
    NOW
);
const scope = { accounts: [] } as const;

describe("what an open month is compared with", () => {
    it("cuts last month to the days this one has run", () => {
        const baseline = baselineOf(ledger, periodOf("2026-10", 1), "month", "prior");

        expect(baseline?.windows).toEqual([{ from: "2026-09-01", to: "2026-09-20" }]);
    });

    it("has nothing to compare with before the first entry", () => {
        expect(baselineOf(ledger, periodOf("2026-09", 1), "month", "prior")).toBeNull();
        expect(baselineOf(ledger, periodOf("2026-10", 1), "month", "average")).toBeNull();
    });
});

describe("tagged spending", () => {
    it("counts an entry with two tags once as tagged and in both tags, and leaves out a tag taken off it", () => {
        const flows = flowsOf(ledger, scope, "spent", "2026-09-01", "2026-10-20", null);
        const link = (tagId: string, deletedAt: number | null = null) => ({ deletedAt, tagId, transactionId: "oct" });
        const tag = (localId: string) => ({ color: null, deletedAt: null, localId, name: localId, sortOrder: 0 });
        const split = splitByTag(ledger, flows, {
            links: [link("a"), link("b"), link("c", 1)],
            tags: [tag("a"), tag("b"), tag("c")],
        });

        expect(split.tagged).toHaveLength(1);
        expect(split.untagged).toHaveLength(1);
        expect(split.groups.map((group) => group.amount)).toEqual([50, 50]);
    });

    it("counts an entry whose only tag was deleted as untagged", () => {
        const flows = flowsOf(ledger, scope, "spent", "2026-09-01", "2026-10-20", null);
        const split = splitByTag(ledger, flows, {
            links: [{ deletedAt: null, tagId: "gone", transactionId: "oct" }],
            tags: [{ color: null, deletedAt: 1, localId: "gone", name: "gone", sortOrder: 0 }],
        });

        expect(split.tagged).toHaveLength(0);
        expect(split.untagged).toHaveLength(2);
    });
});

describe("axisFor", () => {
    it("cuts off one bar far above the rest so the others stay readable", () => {
        const axis = axisFor([1850, 40, 90, 120, 60]);

        expect(axis.clipped).toBe(true);
        expect(axis.cap).toBeLessThan(200);
        expect(axis.cap).toBeGreaterThan(120);
    });

    it("reaches the tallest bar when none stands out", () => {
        const axis = axisFor([40, 90, 120, 60]);

        expect(axis.clipped).toBe(false);
        expect(axis.cap).toBeGreaterThanOrEqual(120);
    });
});

describe("weeksOf", () => {
    it("cuts the first and last week to the span", () => {
        const weeks = weeksOf(ledger, periodOf("2026-10", 1), [], 1);

        expect(weeks[0]?.label.from).toBe("2026-10-01");
        expect(weeks.at(-1)?.label.to).toBe("2026-10-31");
        expect(weeks.every((week) => week.label.from <= week.label.to)).toBe(true);
    });
});
