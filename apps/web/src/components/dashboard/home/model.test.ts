import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import type { CategoryBudget } from "../../../lib/dashboard-series";
import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import { budgetRows, categoryChoices, everyDay, setupState, snapWhatIf, whatIfStep } from "./model";

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

    it("measures up to today, so a day still to come never reads as nothing spent", () => {
        const { measured } = everyDay(ledger, period, SCOPE, []);

        expect(measured).toHaveLength(10);
        expect(measured.at(-1)?.day).toBe("2026-10-10");
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

describe("budgetRows", () => {
    const standing = (spent: number, effectiveLimit: number): CategoryBudget => ({
        effectiveLimit,
        from: "2026-10-01",
        limit: effectiveLimit,
        overBudget: spent > effectiveLimit,
        period: "monthly",
        remaining: effectiveLimit - spent,
        runOut: null,
        spent,
        to: "2026-10-31",
    });
    const target = (id: string, topId = id) => ({ color: "#767676", id, name: id, topId });
    const flat = {
        budgetTargets: new Map(["rent", "food", "coffee", "gym"].map((id) => [id, target(id)])),
        currency: "USD",
    };

    it("lists overspent budgets first, so a small overrun is not hidden under big spending", () => {
        const { rows } = budgetRows(
            flat,
            new Map([
                ["rent", standing(1800, 1800)],
                ["gym", standing(100, 200)],
                ["coffee", standing(90, 60)],
                ["food", standing(500, 400)],
            ])
        );

        expect(rows.map((row) => row.category.id)).toStrictEqual(["food", "coffee", "rent", "gym"]);
    });

    it("counts a subcategory's spending once when its parent has a budget too", () => {
        const nested = {
            ...flat,
            budgetTargets: new Map([
                ["food", target("food")],
                ["costco", target("costco", "food")],
                ["rent", target("rent")],
            ]),
        };

        const { left, limit } = budgetRows(
            nested,
            new Map([
                ["food", standing(300, 400)],
                ["costco", standing(200, 150)],
                ["rent", standing(1000, 1000)],
            ])
        );

        expect({ left, limit }).toStrictEqual({ left: 100, limit: 1400 });
    });

    it("keeps a subcategory budget in the total when its parent has none", () => {
        const { left, limit } = budgetRows(
            {
                ...flat,
                budgetTargets: new Map([["costco", target("costco", "food")]]),
            },
            new Map([["costco", standing(200, 150)]])
        );

        expect({ left, limit }).toStrictEqual({ left: -50, limit: 150 });
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

describe("setupState", () => {
    const account = {
        ...envelope("chase", 1),
        currency: "USD",
        initialBalance: 0,
        initialBalanceDate: 0,
        name: "Chase",
    };
    const budget = { ...envelope("limit", 1), categoryId: "food" };
    const setup = (accounts: unknown[], budgets: unknown[], entries: number) =>
        setupState(
            prepareLedger(
                {
                    ...ledger.books,
                    accounts,
                    budgets,
                    transactions: Array.from({ length: entries }, (_, index) =>
                        entry(index + 1, "2026-10-02", "food", 10)
                    ),
                } as unknown as LedgerBooks,
                NOW
            )
        );

    it("walks account, entry, budget and asks for the account even when an entry came first", () => {
        expect(setup([], [], 0)?.step).toBe("account");
        expect(setup([account], [], 0)?.step).toBe("entry");
        expect(setup([account], [], 1)).toMatchObject({ firstSpendTopId: "food", spent: 10, step: "budget" });
        expect(setup([], [], 1)).toMatchObject({ done: { account: false, entry: true }, step: "account" });
    });

    it("ends once all three are done, or once the ledger is in real use without them", () => {
        expect(setup([account], [budget], 1)).toBeNull();
        expect(setup([], [], 6)).toBeNull();
        expect(setup([account], [], 6)).toBeNull();
    });
});

describe("what-if amounts", () => {
    it("picks a round step that scales with income", () => {
        expect(whatIfStep(4855.21)).toBe(20);
        expect(whatIfStep(4_000_000)).toBe(10_000);
        expect(whatIfStep(120)).toBe(0.5);
    });

    it("never steps below a cent or divides by nothing", () => {
        expect(whatIfStep(3)).toBe(0.01);
        expect(whatIfStep(0)).toBe(0.01);
    });

    it("snaps a keyboard move that started off the grid", () => {
        expect(snapWhatIf(3661, 20, 4855.21)).toBe(3660);
        expect(snapWhatIf(3621, 20, 4855.21)).toBe(3620);
    });

    it("reaches both ends exactly, so End means all of income", () => {
        expect(snapWhatIf(4855.21, 20, 4855.21)).toBe(4855.21);
        expect(snapWhatIf(4850, 20, 4855.21)).toBe(4855.21);
        expect(snapWhatIf(0, 20, 4855.21)).toBe(0);
    });

    it("keeps cents clean on small steps", () => {
        expect(snapWhatIf(0.30000000000000004, 0.1, 10)).toBe(0.3);
    });
});
