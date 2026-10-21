import { describe, expect, it } from "@jest/globals";
import { accountsOverview, isMultiCurrency } from "@outlayr/money/account-overview";
import type { AccountCellRow, OverviewAccount } from "@outlayr/money/account-overview";
import { buildRateTable } from "@outlayr/money/valuation";

import { formatSignedAmount } from "./account-display";

const NOW = new Date("2026-10-18T12:00:00Z");

function cell(overrides: Partial<AccountCellRow> = {}): AccountCellRow {
    return {
        accountId: "a1",
        amount: 0,
        amountUsd: 0,
        count: 1,
        currencyCode: "USD",
        dateKey: "2026-06-01",
        income: false,
        unconvertedAmount: 0,
        unconvertedCount: 0,
        ...overrides,
    };
}

function account(overrides: Partial<OverviewAccount> = {}): OverviewAccount {
    return {
        currency: "USD",
        id: "a1",
        initialBalance: 0,
        ...overrides,
    };
}

describe("formatSignedAmount", () => {
    it("prints a negative balance with a minus and no plus otherwise", () => {
        expect(formatSignedAmount(-1240.5, "USD")).toBe("-$1,240.50");
        expect(formatSignedAmount(1240.5, "USD")).toBe("$1,240.50");
        expect(formatSignedAmount(0, "USD")).toBe("$0.00");
    });

    it("drops the minus when the balance rounds to zero", () => {
        // 120.35 - 100.2 - 20.15 is -7.1e-15 in floating point.
        expect(formatSignedAmount(120.35 - 100.2 - 20.15, "USD")).toBe("$0.00");
        expect(formatSignedAmount(-0.4, "USD", false)).toBe("$0");
        expect(formatSignedAmount(-0.6, "USD", false)).toBe("-$1");
    });
});

describe("isMultiCurrency", () => {
    it("is true only once a foreign-currency cell exists", () => {
        expect(isMultiCurrency([], "USD")).toBe(false);
        expect(isMultiCurrency([{ amount: 5, currencyCode: "USD" }], "USD")).toBe(false);
        expect(
            isMultiCurrency(
                [
                    { amount: 5, currencyCode: "USD" },
                    { amount: 3, currencyCode: "EUR" },
                ],
                "USD"
            )
        ).toBe(true);
    });

    it("does not count a null-currency entry as foreign", () => {
        expect(isMultiCurrency([{ amount: 5, currencyCode: null }], "USD")).toBe(false);
    });
});

function summary(result: ReturnType<typeof accountsOverview>) {
    if (result === null) {
        return null;
    }
    const { rows: _rows, ...rest } = result;
    return rest;
}

describe("accountsOverview", () => {
    const rates = buildRateTable([{ date: "2026-01-01", quote: "EUR", rate: 2 }]);

    it("is null with no accounts, so the card can hide", () => {
        expect(accountsOverview([], [], "USD", rates, NOW)).toBeNull();
    });

    it("sums same-currency accounts at face value, exactly", () => {
        const result = accountsOverview(
            [account({ id: "a1", initialBalance: 100 }), account({ id: "a2", initialBalance: 50 })],
            [
                cell({ accountId: "a1", amount: 25, amountUsd: 25 }),
                cell({ accountId: "a2", amount: 10, amountUsd: 10, income: true }),
            ],
            "USD",
            rates,
            NOW
        );
        expect(summary(result)).toStrictEqual({
            count: 2,
            exact: true,
            owe: 0,
            own: 100 - 25 + 50 + 10,
            total: 100 - 25 + 50 + 10,
        });
    });

    it("restates a foreign account at today's rate, not the one it opened at", () => {
        const moved = buildRateTable([
            { date: "2026-01-01", quote: "EUR", rate: 2 },
            { date: "2026-06-01", quote: "EUR", rate: 4 },
        ]);
        const result = accountsOverview([account({ currency: "EUR", initialBalance: 80 })], [], "USD", moved, NOW);
        expect(summary(result)).toStrictEqual({ count: 1, exact: true, owe: 0, own: 20, total: 20 });
    });

    it("counts an entry older than every rate held, at today's rate", () => {
        const result = accountsOverview(
            [account()],
            [cell({ amount: 1000, amountUsd: 1000, dateKey: "2025-11-20", income: true })],
            "EUR",
            buildRateTable([{ date: "2026-07-01", quote: "EUR", rate: 0.9 }]),
            NOW
        );
        expect(summary(result)).toStrictEqual({ count: 1, exact: true, owe: 0, own: 900, total: 900 });
    });

    it("leaves out an account no rate can restate, rather than adding it at face value", () => {
        const result = accountsOverview(
            [
                account({
                    currency: "GBP",
                    initialBalance: 80,
                }),
            ],
            [],
            "USD",
            rates,
            NOW
        );
        expect(summary(result)).toStrictEqual({ count: 1, exact: false, owe: 0, own: 0, total: 0 });
    });

    it("marks approximate when a cell cannot convert", () => {
        const result = accountsOverview(
            [account({ id: "a1", initialBalance: 0 })],
            [
                cell({
                    accountId: "a1",
                    amount: 10,
                    amountUsd: 0,
                    currencyCode: "GBP",
                    unconvertedAmount: 10,
                    unconvertedCount: 1,
                }),
            ],
            "USD",
            rates,
            NOW
        );
        expect(result?.exact).toBe(false);
    });

    it("ignores cells for accounts not in the live list", () => {
        const result = accountsOverview(
            [account({ id: "a1", initialBalance: 5 })],
            [cell({ accountId: "tombstoned", amount: 100, amountUsd: 100 })],
            "USD",
            rates,
            NOW
        );
        expect(summary(result)).toStrictEqual({ count: 1, exact: true, owe: 0, own: 5, total: 5 });
    });

    it("tells a card apart from an overdrawn current account", () => {
        const result = accountsOverview(
            [
                account({ id: "a1", initialBalance: -200, kind: "liability" }),
                account({ id: "a2", initialBalance: -50 }),
            ],
            [],
            "USD",
            rates,
            NOW
        );
        expect(summary(result)).toStrictEqual({ count: 2, exact: true, owe: 200, own: -50, total: -250 });
    });
});

describe("accountsOverview rows", () => {
    const rates = buildRateTable([{ date: "2026-01-01", quote: "EUR", rate: 2 }]);

    it("states every account in the ledger's order, valued and kinded", () => {
        const result = accountsOverview(
            [
                account({ id: "card", initialBalance: -200, kind: "liability" }),
                account({ currency: "EUR", id: "eur", initialBalance: 80 }),
                account({ id: "cash", initialBalance: 30 }),
            ],
            [cell({ accountId: "cash", amount: 5, amountUsd: 5 })],
            "USD",
            rates,
            NOW
        );
        expect(result?.rows).toStrictEqual([
            { balance: -200, exact: true, id: "card", kind: "liability", multiCurrency: false },
            { balance: 40, exact: true, id: "eur", kind: "asset", multiCurrency: false },
            { balance: 25, exact: true, id: "cash", kind: "asset", multiCurrency: false },
        ]);
    });

    it("marks only the row that could not be valued", () => {
        const result = accountsOverview(
            [account({ currency: "GBP", id: "gbp", initialBalance: 80 }), account({ id: "usd" })],
            [],
            "USD",
            rates,
            NOW
        );
        expect(result?.rows.map((row) => row.exact)).toStrictEqual([false, true]);
        expect(result?.exact).toBe(false);
    });

    it("flags an account holding a currency other than its own", () => {
        const result = accountsOverview(
            [account({ id: "a1" })],
            [cell({ accountId: "a1", amount: 10, amountUsd: 20, currencyCode: "EUR" })],
            "USD",
            rates,
            NOW
        );
        expect(result?.rows[0]?.multiCurrency).toBe(true);
    });
});
