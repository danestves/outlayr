import { describe, expect, it } from "@jest/globals";

import { groupByDay } from "./day-sections";
import { mergeByRecency, toAccountTransferRow, toTransferLogRow } from "./transfer-log-rows";
import type { TransferEnd, TransferLogFee } from "./transfer-log-rows";

const DAY = new Date(2026, 7, 9);

const TRANSFER = {
    date: DAY,
    day: DAY,
    exchangeRate: 55.5,
    fromAccountId: "a",
    fromAmount: 100,
    fromAmountUsd: 100,
    fromCurrency: "USD",
    id: "t1",
    note: "",
    toAccountId: "b",
    toAmount: 5550,
    toAmountUsd: 100,
    toCurrency: "VES",
};

const MARK = { customColor: null, emoji: null, icon: null, imageColor: null, imageUri: null, kind: "asset" as const };
const ZINLI = { ...MARK, name: "Zinli" };
const BANESCO = { ...MARK, imageUri: "file:///banesco.png", name: "Banesco" };
const ACCOUNTS = new Map<string, TransferEnd>([
    ["a", ZINLI],
    ["b", BANESCO],
]);

describe("toTransferLogRow", () => {
    it("names both ends in the direction the money went", () => {
        expect(toTransferLogRow(TRANSFER, ACCOUNTS).note).toBe("Zinli → Banesco");
    });

    it("carries both accounts for the tile, and neither once one is gone", () => {
        expect(toTransferLogRow(TRANSFER, ACCOUNTS).ends).toStrictEqual({ from: ZINLI, to: BANESCO });
        expect(toTransferLogRow(TRANSFER, new Map([["a", ZINLI]])).ends).toBeNull();
    });

    it("falls back to the transfer's own note when the user wrote one", () => {
        expect(toTransferLogRow({ ...TRANSFER, note: "Cambio" }, ACCOUNTS).note).toBe("Cambio");
    });

    it("carries the outbound leg, so the figure is what left", () => {
        const row = toTransferLogRow(TRANSFER, ACCOUNTS);
        expect(row.amount).toBe(100);
        expect(row.currency).toBe("USD");
    });

    it("states what left with a source fee in it, and what arrived with a destination fee out of it", () => {
        const sameCurrency = { ...TRANSFER, exchangeRate: 1, fromAmount: 98, toAmount: 98, toCurrency: "USD" };
        const atSource = toTransferLogRow(sameCurrency, ACCOUNTS, new Map([["t1", [{ accountId: "a", amount: 2 }]]]));
        const atDestination = toTransferLogRow(TRANSFER, ACCOUNTS, new Map([["t1", [{ accountId: "b", amount: 50 }]]]));

        expect(atSource.moved).toStrictEqual({
            arrived: 98,
            arrivedCurrency: "USD",
            fees: [{ amount: 2, currency: "USD" }],
            outside: null,
            sent: 100,
        });
        expect(atDestination.moved).toStrictEqual({
            arrived: 5500,
            arrivedCurrency: "VES",
            fees: [{ amount: 50, currency: "VES" }],
            outside: null,
            sent: 100,
        });
        expect(atSource.amount).toBe(98);
        expect(toTransferLogRow(TRANSFER, ACCOUNTS, new Map()).moved?.fees).toStrictEqual([]);
        expect(toTransferLogRow(TRANSFER, ACCOUNTS).moved).toBeUndefined();
    });

    it("takes a fee on each side out of what left and what arrived", () => {
        const payoneer = { ...TRANSFER, exchangeRate: 1, fromAmount: 100, toAmount: 100, toCurrency: "USD" };
        const both = new Map([
            [
                "t1",
                [
                    { accountId: "a", amount: 15 },
                    { accountId: "b", amount: 16.05 },
                ],
            ],
        ]);

        expect(toTransferLogRow(payoneer, ACCOUNTS, both).moved).toStrictEqual({
            arrived: 83.95,
            arrivedCurrency: "USD",
            fees: [
                { amount: 15, currency: "USD" },
                { amount: 16.05, currency: "USD" },
            ],
            outside: null,
            sent: 115,
        });
    });

    it("names what arrived beyond the saved rate as money from another account, in the sender's currency", () => {
        const binance = {
            ...TRANSFER,
            exchangeRate: 957.1,
            fromAmount: 152.66,
            toAmount: 157_471.66,
        };

        expect(
            toTransferLogRow(binance, ACCOUNTS, new Map([["t1", [{ accountId: "a", amount: 7.34 }]]])).moved?.outside
        ).toStrictEqual({
            amount: 11.87,
            currency: "USD",
        });
    });

    it("finds nothing from outside when the saved rate reproduces the arrival", () => {
        const rounded = { ...TRANSFER, exchangeRate: 957.1, fromAmount: 152.66, toAmount: 146_110.89 };
        expect(toTransferLogRow(rounded, ACCOUNTS, new Map()).moved?.outside).toBeNull();
    });

    it("finds nothing from outside in a rate saved as the ten-decimal ratio of its legs", () => {
        const dong = {
            ...TRANSFER,
            exchangeRate: 0.0000392394,
            fromAmount: 228_196_944,
            fromCurrency: "VND",
            toAmount: 8954.32,
            toCurrency: "USD",
        };
        expect(toTransferLogRow(dong, ACCOUNTS, new Map()).moved?.outside).toBeNull();
    });

    it("finds nothing from outside between two accounts in one currency", () => {
        const level = { ...TRANSFER, exchangeRate: 1, fromAmount: 100, toAmount: 105, toCurrency: "USD" };
        expect(toTransferLogRow(level, ACCOUNTS, new Map()).moved?.outside).toBeNull();
    });

    it("is excluded from day totals", () => {
        expect(toTransferLogRow(TRANSFER, ACCOUNTS).excludedFromTotals).toBe(true);
    });
});

describe("toAccountTransferRow", () => {
    it("signs each account's own leg, net of a fee charged on that side", () => {
        const atSource = new Map([["t1", [{ accountId: "a", amount: 2 }]]]);
        expect(toAccountTransferRow(TRANSFER, "a", ACCOUNTS, atSource)).toMatchObject({
            currency: "USD",
            moved: { sent: 102 },
            sign: "-",
        });
        expect(toAccountTransferRow(TRANSFER, "b", ACCOUNTS, atSource)).toMatchObject({
            amount: 5550,
            currency: "VES",
            moved: { fees: [], outside: null, sent: 5550 },
            sign: "+",
        });

        const atDestination = new Map([["t1", [{ accountId: "b", amount: 2 }]]]);
        expect(toAccountTransferRow(TRANSFER, "b", ACCOUNTS, atDestination)).toMatchObject({
            amount: 5550,
            moved: { fees: [], sent: 5548 },
            sign: "+",
        });
    });
});

describe("an account page's day total", () => {
    const expense = (id: string, amount: number, currency: string, transferId: string | null) => ({
        amount,
        amountUsd: null,
        currency,
        date: DAY,
        day: DAY,
        feeForId: null,
        id,
        income: false,
        transferId,
    });

    function dayTotals(accountId: string, currency: string, fee: TransferLogFee, own: ReturnType<typeof expense>[]) {
        const transfer = toAccountTransferRow(TRANSFER, accountId, ACCOUNTS, new Map([["t1", [fee]]]));
        const [section] = groupByDay([transfer, ...own], currency);
        return section.totals.map((bucket) => [bucket.currencyCode, bucket.amount]);
    }

    it("is what arrived less the fee the receiving account paid", () => {
        const fee = { accountId: "b", amount: 50 };

        expect(dayTotals("a", "USD", fee, [expense("coffee", 10, "USD", null)])).toStrictEqual([["USD", -110]]);
        expect(dayTotals("b", "VES", fee, [expense("fee", 50, "VES", "t1")])).toStrictEqual([["VES", 5500]]);
    });
});

describe("mergeByRecency", () => {
    const older = { date: new Date(2026, 7, 8), day: new Date(2026, 7, 8), id: "x" };
    const newer = { date: new Date(2026, 7, 9, 10), day: new Date(2026, 7, 9), id: "y" };
    const newest = { date: new Date(2026, 7, 9, 18), day: new Date(2026, 7, 9), id: "z" };

    it("interleaves two newest-first lists into one", () => {
        expect(mergeByRecency([newest, older], [newer]).map((row) => row.id)).toStrictEqual(["z", "y", "x"]);
    });

    it("keeps day order ahead of time order", () => {
        const lateOnOlderDay = { date: new Date(2026, 7, 8, 23), day: new Date(2026, 7, 8), id: "late" };
        expect(mergeByRecency([newer], [lateOnOlderDay]).map((row) => row.id)).toStrictEqual(["y", "late"]);
    });
});
