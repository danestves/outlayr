import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { cardStatement, flowsOf } from "../components/dashboard/accounts/model";
import type { AccountRow } from "../components/dashboard/accounts/model";
import { prepareLedger } from "./dashboard-series-ledger";
import type { Ledger } from "./dashboard-series-ledger";
import type { CommitRow } from "./ledger-committer";
import {
    createdTransfer,
    newTransferInput,
    newTransferProblem,
    newTransferValues,
    withArrived,
    withSent,
} from "./transfer-create";

const NOW = Date.parse("2026-11-08T16:00:00Z");
const OPENED = Date.parse("2026-01-01T04:00:00Z");
const BEFORE_CLOSE = Date.parse("2026-10-20T16:00:00Z");
const DAY_OCT_20 = Date.parse("2026-10-20T04:00:00Z");

const envelope = (localId: string) => ({ deletedAt: null, localId, restoredAt: null, updatedAt: 1, userId: "u" });

const account = (localId: string, currency: string, kind: string, initialBalance: number, extra = {}) => ({
    ...envelope(localId),
    currency,
    initialBalance,
    initialBalanceDate: OPENED,
    kind,
    name: localId,
    sortOrder: 0,
    ...extra,
});

const AMEX = { creditLimit: 10_000, paymentDay: 20, statementDay: 25 };

const bookedOn = (localId: string, amount: number, date: number, day: number, accountId = "amex") => ({
    ...envelope(localId),
    accountId,
    amount,
    amountUsd: amount,
    categoryId: null,
    currency: "USD",
    date,
    day,
    income: false,
    note: "",
    recurringType: 0,
});

const pastTransfer = (localId: string, fromAccountId: string, date: number) => ({
    ...envelope(localId),
    date,
    day: date,
    fromAccountId,
    fromAmount: 10,
    fromAmountUsd: 10,
    fromCurrency: "USD",
    month: date,
    note: "",
    toAccountId: "amex",
    toAmount: 10,
    toAmountUsd: 10,
    toCurrency: "USD",
});

const ledgerOf = (patch: { accounts?: unknown[]; rates?: unknown[]; transfers?: unknown[] } = {}) =>
    prepareLedger(
        {
            accounts: patch.accounts ?? [
                account("bdv", "VES", "asset", 1_000_000),
                account("chase", "USD", "asset", 5000),
                account("savings", "USD", "asset", 900),
                account("amex", "USD", "liability", -1200, AMEX),
            ],
            appMeta: [
                { key: "timeZone", value: "America/Caracas" },
                { key: "currency", value: "USD" },
            ],
            budgets: [],
            categories: [],
            exchangeRates: patch.rates ?? [{ date: "2026-10-01", quote: "VES", rate: 500, rateType: "official" }],
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            transactions: [bookedOn("chipotle", 300, BEFORE_CLOSE, DAY_OCT_20)],
            transfers: patch.transfers ?? [],
        } as unknown as LedgerBooks,
        NOW
    );

const fieldsOf = (row: CommitRow | undefined) => {
    if (!row) {
        throw new Error("no row");
    }
    return row.fields as unknown as Record<string, unknown>;
};

const statementOf = (ledger: Ledger) =>
    cardStatement(
        {
            currency: "USD",
            initialBalance: -1200,
            openedDay: "2026-01-01",
            paymentDay: 20,
            statementDay: 25,
        } as Pick<AccountRow, "currency" | "initialBalance" | "openedDay" | "paymentDay" | "statementDay">,
        flowsOf(ledger, "amex"),
        ledger.today,
        []
    );

const withRows = (ledger: Ledger, rows: CommitRow[]) =>
    prepareLedger(
        {
            ...ledger.books,
            transactions: [
                ...ledger.books.transactions,
                ...rows
                    .filter((row) => row.table === "transactions")
                    .map((row) => ({ ...envelope(row.localId), ...row.fields })),
            ],
            transfers: [
                ...ledger.books.transfers,
                ...rows
                    .filter((row) => row.table === "transfers")
                    .map((row) => ({ ...envelope(row.localId), ...row.fields })),
            ],
        } as unknown as LedgerBooks,
        NOW
    );

const paid = (ledger: Ledger, values: ReturnType<typeof newTransferValues>, at = NOW) => {
    const input = newTransferInput(ledger, values);
    if (!input) {
        throw new Error("no input");
    }
    return createdTransfer(ledger, "pay", input, at);
};

describe("paying a card", () => {
    it("opens on the statement, from a bank in the card's currency", () => {
        const values = newTransferValues(ledgerOf(), "amex", 1500, NOW);
        expect(values).toMatchObject({ fromId: "chase", sentText: "$1,500.00", toId: "amex" });
    });

    it("opens from the account that paid this card last", () => {
        const ledger = ledgerOf({
            transfers: [pastTransfer("old", "chase", BEFORE_CLOSE), pastTransfer("new", "savings", NOW - 1000)],
        });
        expect(newTransferValues(ledger, "amex", 1500, NOW).fromId).toBe("savings");
    });

    it("clears the statement and moves the money on both accounts", () => {
        const ledger = ledgerOf();
        expect(statementOf(ledger)?.due).toBe(1500);
        const after = withRows(ledger, paid(ledger, newTransferValues(ledger, "amex", 1500, NOW)));
        expect(statementOf(after)?.due).toBe(0);
        expect(flowsOf(after, "amex").some((flow) => flow.value === 1500)).toBe(true);
        expect(flowsOf(after, "chase").some((flow) => flow.value === -1500)).toBe(true);
    });

    it("reduces the statement by a partial payment", () => {
        const ledger = ledgerOf();
        const values = withSent(ledger, newTransferValues(ledger, "amex", 1500, NOW), "400");
        const after = withRows(ledger, paid(ledger, values));
        expect(statementOf(after)?.due).toBe(1100);
    });

    it("files a late payment on the ledger's day, not the browser's", () => {
        const ledger = ledgerOf();
        const lateNight = Date.parse("2026-11-09T03:30:00Z");
        const [row] = paid(ledger, newTransferValues(ledger, "amex", 1500, lateNight), lateNight);
        expect(fieldsOf(row).day).toBe(Date.parse("2026-11-08T04:00:00Z"));
        expect(fieldsOf(row).month).toBe(Date.parse("2026-11-01T04:00:00Z"));
    });

    it("takes a source fee out of what was sent, on a row tied to the transfer", () => {
        const ledger = ledgerOf();
        const values = { ...newTransferValues(ledger, "amex", 1500, NOW), feeText: "5" };
        const input = newTransferInput(ledger, values, "Fee: chase to amex");
        if (!input) {
            throw new Error("no input");
        }
        const [move, fee] = createdTransfer(ledger, "pay", input, NOW);
        expect(fieldsOf(move)).toMatchObject({ fromAmount: 1495, toAmount: 1495 });
        expect(fieldsOf(fee)).toMatchObject({
            accountId: "chase",
            amount: 5,
            categoryId: null,
            income: false,
            note: "Fee: chase to amex",
            transferId: "pay",
        });
    });
});

describe("a payment in another currency", () => {
    const fromBank = (ledger: Ledger) => ({ ...newTransferValues(ledger, "amex", 1500, NOW), fromId: "bdv" });

    it("sends what the statement costs at the day's rate and freezes each leg", () => {
        const ledger = ledgerOf({
            accounts: [account("bdv", "VES", "asset", 1_000_000), account("amex", "USD", "liability", -1200, AMEX)],
        });
        const values = newTransferValues(ledger, "amex", 1500, NOW);
        expect(values.fromId).toBe("bdv");
        const [move] = paid(ledger, values);
        expect(fieldsOf(move)).toMatchObject({
            exchangeRate: 0.002,
            exchangeRateType: "official",
            fromAmount: 750_000,
            fromAmountUsd: 1500,
            fromCurrency: "VES",
            toAmount: 1500,
            toAmountUsd: 1500,
            toCurrency: "USD",
        });
    });

    it("converts late at night on the same day's rate it freezes", () => {
        const ledger = ledgerOf({
            accounts: [account("bdv", "VES", "asset", 1_000_000), account("amex", "USD", "liability", -1200, AMEX)],
            rates: [
                { date: "2026-11-08", quote: "VES", rate: 500, rateType: "official" },
                { date: "2026-11-09", quote: "VES", rate: 600, rateType: "official" },
            ],
        });
        const lateNight = Date.parse("2026-11-09T03:30:00Z");
        const [move] = paid(ledger, newTransferValues(ledger, "amex", 100, lateNight), lateNight);
        expect(fieldsOf(move)).toMatchObject({ fromAmount: 60_000, fromAmountUsd: 100, toAmountUsd: 100 });
    });

    it("keeps what the bank really paid as a custom rate", () => {
        const ledger = ledgerOf();
        const typed = withArrived(ledger, withSent(ledger, fromBank(ledger), "600000"), "1000");
        const sentAgain = withSent(ledger, typed, "650000");
        const [move] = paid(ledger, sentAgain);
        expect(fieldsOf(move)).toMatchObject({ exchangeRateType: "custom", fromAmount: 650_000, toAmount: 1000 });
    });

    it("refuses a day with no published rate", () => {
        const ledger = ledgerOf({ rates: [] });
        const values = { ...fromBank(ledger), arrivedText: "1500", sentText: "750000" };
        expect(newTransferProblem(ledger, values)).toBe("rateMissing");
    });
});

describe("an account that is not a card", () => {
    it("sends from a loan, with no amount, instead of paying into it", () => {
        const ledger = ledgerOf({
            accounts: [account("chase", "USD", "asset", 5000), account("loan", "USD", "liability", -900)],
        });
        expect(newTransferValues(ledger, "loan", null, NOW)).toMatchObject({
            fromId: "loan",
            sentText: "",
            toId: "chase",
        });
    });
});

describe("what a transfer refuses", () => {
    it("refuses a blank amount, one account on both legs and a fee that takes everything", () => {
        const ledger = ledgerOf();
        const values = newTransferValues(ledger, "amex", 0, NOW);
        expect(newTransferProblem(ledger, values)).toBe("amount");
        expect(newTransferProblem(ledger, { ...values, fromId: "amex", sentText: "10" })).toBe("same-account");
        expect(newTransferProblem(ledger, { ...values, feeText: "10", sentText: "10" })).toBe("amount");
    });
});
