import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import { budgetFill, categoryChoices, everyDay } from "./model";

const NOW = Date.parse("2026-10-10T15:00:00Z");
const period = { days: 31, from: "2026-10-01", key: "2026-10", to: "2026-10-31" };
const SCOPE = { accounts: [] };

const envelope = (localId: string, seq: number) => ({
    deletedAt: null,
    deviceId: "device",
    localId,
    seq,
    updatedAt: 0,
    userId: "owner",
});

const category = (localId: string, income = false) => ({
    ...envelope(localId, 1),
    color: "#000000",
    emoji: null,
    icon: null,
    income,
    name: localId,
    parentId: null,
    sortOrder: 0,
});

const entry = (seq: number, day: string, categoryId: string, amount: number, income = false) => ({
    ...envelope(`entry-${seq}`, seq),
    accountId: "chase",
    amount,
    amountUsd: amount,
    categoryId,
    currency: "USD",
    date: Date.parse(`${day}T12:00:00Z`),
    day: Date.parse(`${day}T00:00:00Z`),
    exchangeRate: null,
    income,
    note: "",
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
});

const ledger = prepareLedger(
    {
        accounts: [
            { ...envelope("chase", 1), currency: "USD", initialBalance: 0, initialBalanceDate: 0, name: "Chase" },
        ],
        appMeta: [{ key: "timeZone", value: "UTC" }],
        budgets: [],
        categories: [category("food"), category("rent"), category("travel"), category("salary", true)],
        exchangeRates: [],
        installmentPlans: [],
        mainBudget: [],
        outsideMoves: [],
        outsidePayments: [],
        transactions: [
            entry(5, "2026-09-05", "travel", 40),
            entry(1, "2026-10-01", "rent", 70),
            entry(2, "2026-10-02", "food", 30),
            entry(3, "2026-10-08", "salary", 500, true),
            entry(4, "2026-10-20", "food", 900),
        ],
        transfers: [],
    } as unknown as LedgerBooks,
    NOW
);

describe("everyDay", () => {
    it("averages over the days elapsed and leaves future entries out", () => {
        const days = everyDay(ledger, period, SCOPE, []);

        expect(days.average).toBe(10);
        expect(days.top).toMatchObject({ amount: 70, day: "2026-10-01", topId: "rent" });
        expect(days.runnerUp).toMatchObject({ amount: 30, day: "2026-10-02" });
        expect(days.cells).toHaveLength(31);
    });

    it("offsets the grid so a Thursday first lands in the Monday-first column", () => {
        expect(everyDay(ledger, period, SCOPE, []).lead).toBe(3);
    });

    it("narrows to the picked categories", () => {
        const days = everyDay(ledger, period, SCOPE, ["food"]);

        expect(days.average).toBe(3);
        expect(days.top?.day).toBe("2026-10-02");
        expect(days.runnerUp).toBeNull();
    });
});

describe("budgetFill", () => {
    it("shows spent over limit, then limit over spent once it overruns", () => {
        expect(budgetFill({ effectiveLimit: 200, spent: 50 })).toBe(0.25);
        expect(budgetFill({ effectiveLimit: 50, spent: 200 })).toBe(0.25);
    });

    it("stays empty with no limit or no spending", () => {
        expect(budgetFill({ effectiveLimit: 0, spent: 50 })).toBe(0);
        expect(budgetFill({ effectiveLimit: 50, spent: 0 })).toBe(0);
    });
});

describe("categoryChoices", () => {
    const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);

    it("offers only categories with spending and never income", () => {
        const choices = categoryChoices(ledger, period, SCOPE, []);

        expect([...ids(choices.recent), ...ids(choices.all)].toSorted()).toStrictEqual(["food", "rent"]);
    });

    it("leaves recent categories with nothing spent this period out of the list", () => {
        const september = { days: 30, from: "2026-09-01", key: "2026-09", to: "2026-09-30" };
        const choices = categoryChoices(ledger, september, SCOPE, []);

        expect([...ids(choices.recent), ...ids(choices.all)]).toStrictEqual(["travel"]);
    });

    it("pins what is picked even with nothing spent this period", () => {
        const { recent } = categoryChoices(ledger, period, SCOPE, ["travel"]);

        expect(ids(recent)[0]).toBe("travel");
    });
});
