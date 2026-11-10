import { describe, expect, it } from "vite-plus/test";

import { buildLog } from "./ledger-log";
import type { AccountSource, EntrySource, TransferSource } from "./ledger-log";
import { buildRateTable } from "./valuation";

const DAY = Date.UTC(2026, 10, 4);

const entry = (localId: string, fields: Partial<EntrySource> = {}): EntrySource => ({
    accountId: "banesco",
    amount: 10,
    amountUsd: 10,
    categoryId: null,
    currency: "USD",
    customColor: null,
    date: DAY + 12 * 3_600_000,
    day: DAY,
    emoji: null,
    exchangeRate: null,
    exchangeRateType: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    income: false,
    localId,
    note: localId,
    recurringType: 0,
    ...fields,
});

const account = (localId: string, name: string): AccountSource => ({
    customColor: null,
    emoji: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    localId,
    name,
});

const transfer: TransferSource = {
    date: DAY + 11 * 3_600_000,
    day: DAY,
    fromAccountId: "payoneer",
    fromAmount: 100,
    fromCurrency: "USD",
    localId: "move",
    note: "",
    toAccountId: "banesco",
    toAmount: 40_000,
    toCurrency: "VES",
};

const logOf = (entries: EntrySource[], transfers: TransferSource[] = [], limit = 30) =>
    buildLog({
        accounts: new Map([
            ["banesco", account("banesco", "Banesco")],
            ["payoneer", account("payoneer", "Payoneer")],
        ]),
        categories: new Map(),
        clock: { dayOf: (row) => new Date(row.day).toISOString().slice(0, 10), timeOf: () => "12:00" },
        currency: "USD",
        entries,
        entriesFull: false,
        limit,
        rates: buildRateTable([{ date: "2026-11-04", quote: "VES", rate: 400 }]),
        transfers,
        transfersFull: false,
    });

describe("buildLog", () => {
    it("folds a card fee into its purchase and still counts it in the day", () => {
        const [day] = logOf([
            entry("dinner", { amount: 50, amountUsd: 50 }),
            entry("fee", { amount: 1.5, amountUsd: 1.5, feeForId: "dinner" }),
        ]);

        expect(day?.rows).toMatchObject([{ fee: { amount: 1.5, currency: "USD" }, id: "dinner" }]);
        expect(day?.totals).toStrictEqual([{ amount: -51.5, currency: "USD" }]);
    });

    it("shows a transfer once, with its fee in what was sent, and leaves the move out of the day", () => {
        const [day] = logOf(
            [entry("wire fee", { accountId: "payoneer", amount: 5, amountUsd: 5, transferId: "move" })],
            [transfer]
        );

        expect(day?.rows).toMatchObject([{ arrived: 40_000, note: "Payoneer → Banesco", sent: 105, type: "transfer" }]);
        expect(day?.totals).toStrictEqual([{ amount: -5, currency: "USD" }]);
    });

    it("takes a fee charged at the destination off what arrived", () => {
        const [day] = logOf(
            [entry("bank fee", { amount: 120, amountUsd: 0.3, currency: "VES", transferId: "move" })],
            [transfer]
        );

        expect(day?.rows).toMatchObject([{ arrived: 39_880, sent: 100 }]);
    });

    it("restates a foreign entry in the ledger currency only when a rate places it", () => {
        const [day] = logOf([
            entry("bread", { amount: 4000, amountUsd: 10, currency: "VES" }),
            entry("old", { amount: 4000, amountUsd: null, currency: "VES", date: Date.UTC(2020, 0, 1) }),
        ]);

        expect(day?.rows).toMatchObject([
            { currency: "VES", id: "bread", valued: 10 },
            { currency: "VES", id: "old", valued: null },
        ]);
    });

    it("shows a row saved without a currency at its exact value, as its day counts it", () => {
        const [day] = logOf([entry("legacy", { amount: 4000, amountUsd: 10, currency: null })]);

        expect(day?.rows).toMatchObject([{ amount: 10, currency: "USD", valued: null }]);
        expect(day?.totals).toStrictEqual([{ amount: -10, currency: "USD" }]);
    });

    it("runs the last shown day to its end instead of cutting it", () => {
        const rows = [
            entry("a", { day: DAY + 86_400_000 }),
            entry("b", { date: DAY + 3_600_000 }),
            entry("c", { date: DAY + 2 * 3_600_000 }),
        ];

        expect(logOf(rows, [], 2).flatMap((day) => day.rows.map((row) => row.id))).toStrictEqual(["a", "c", "b"]);
    });
});
