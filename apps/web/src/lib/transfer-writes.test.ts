import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "./dashboard-series-ledger";
import type { LedgerBooks } from "./ledger-books";
import {
    editedTransfer,
    repriced,
    swappedTransfer,
    transferBaseOf,
    transferInputOf,
    transferProblem,
    withAccounts,
} from "./transfer-writes";
import type { TransferValues } from "./transfer-writes";

const OCT = Date.parse("2026-10-01T15:00:00Z");
const NOW = Date.parse("2026-11-08T15:00:00Z");
// 22:30 on Nov 7 in Caracas (UTC-4), already Nov 8 in UTC.
const LATE = Date.parse("2026-11-08T02:30:00Z");

const envelope = (localId: string) => ({
    deletedAt: null,
    deviceId: "d",
    localId,
    seq: 1,
    updatedAt: OCT,
    userId: "u",
});
const account = (localId: string, currency: string) => ({
    ...envelope(localId),
    currency,
    initialBalance: 0,
    initialBalanceDate: 0,
    name: localId,
});
const move = (extra: Record<string, unknown> = {}) => ({
    ...envelope("t1"),
    date: OCT,
    day: OCT,
    exchangeRate: 500,
    exchangeRateType: "official",
    fromAccountId: "chase",
    fromAmount: 100,
    fromAmountUsd: 100,
    fromCurrency: "USD",
    month: OCT,
    note: "",
    toAccountId: "banco",
    toAmount: 50_000,
    toAmountUsd: 100,
    toCurrency: "VES",
    ...extra,
});
const fee = (extra: Record<string, unknown> = {}) => ({
    ...envelope("f1"),
    accountId: "chase",
    amount: 2,
    amountUsd: 2,
    categoryId: null,
    currency: "USD",
    date: OCT,
    day: OCT,
    income: false,
    month: OCT,
    note: "wire",
    transferId: "t1",
    ...extra,
});

const ledgerWith = (transfer: unknown, transactions: unknown[] = [], exchangeRates: unknown[] = []) =>
    prepareLedger(
        {
            accounts: [account("chase", "USD"), account("banco", "VES"), account("wise", "USD")],
            appMeta: [
                { key: "timeZone", value: "America/Caracas" },
                { key: "currency", value: "USD" },
            ],
            budgetPlans: [],
            budgets: [],
            categories: [],
            exchangeRates,
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            transactions,
            transfers: [transfer],
            // SAFETY: rows carry what these rules read, the validators are not under test.
        } as unknown as LedgerBooks,
        NOW
    );

const rate = (quote: string, value: number) => ({
    _id: quote,
    date: "2026-10-01",
    quote,
    rate: value,
    rateType: "official",
});

const baseFor = (transactions: unknown[], transfer: unknown, rates: unknown[]) => {
    const ledger = ledgerWith(transfer, transactions, rates);
    const [doc] = ledger.books.transfers;
    if (!doc) {
        throw new Error("no transfer");
    }
    return { base: transferBaseOf(ledger, doc), doc, ledger };
};

const editOf = (transactions: unknown[], change: (values: TransferValues) => TransferValues, transfer = move()) => {
    const { base, doc, ledger } = baseFor(transactions, transfer, [rate("VES", 500)]);
    const input = transferInputOf(ledger, base, change(base.start));
    return {
        input,
        ledger,
        problem: transferProblem(ledger, doc, input),
        rows: editedTransfer(ledger, doc, input, NOW),
    };
};

const fieldsOf = (rows: ReturnType<typeof editOf>["rows"], localId: string) => {
    const row = rows.find((each) => each.localId === localId);
    if (!row) {
        throw new Error(`no row ${localId}`);
    }
    return { ...row, fields: new Map(Object.entries(row.fields)) };
};

describe("editedTransfer", () => {
    it("leaves stored amounts, frozen USD and rate alone when only the note changes", () => {
        const { rows } = editOf(
            [],
            (values) => ({ ...values, note: "rent" }),
            move({ fromAmount: 33.335, fromAmountUsd: 33.3 })
        );
        const { fields } = fieldsOf(rows, "t1");
        expect(fields.get("fromAmount")).toBe(33.335);
        expect(fields.get("fromAmountUsd")).toBe(33.3);
        expect(fields.get("exchangeRate")).toBe(500);
        expect(fields.get("exchangeRateType")).toBe("official");
        expect(fields.get("note")).toBe("rent");
    });

    it("scales frozen USD with a changed amount and stores the rate the two amounts give", () => {
        const { rows } = editOf([], (values) => ({
            ...values,
            arrivedText: "60,000.00",
            rateType: "custom",
            sentText: "100.00",
        }));
        const { fields } = fieldsOf(rows, "t1");
        expect(fields.get("toAmount")).toBe(60_000);
        expect(fields.get("toAmountUsd")).toBe(120);
        expect(fields.get("exchangeRate")).toBe(600);
        expect(fields.get("exchangeRateType")).toBe("custom");
    });

    it("swaps accounts, amounts and currencies together, with the fee staying on its account", () => {
        const { rows } = editOf([fee()], swappedTransfer);
        const transfer = fieldsOf(rows, "t1").fields;
        expect([transfer.get("fromAccountId"), transfer.get("fromAmount"), transfer.get("fromCurrency")]).toStrictEqual(
            ["banco", 50_000, "VES"]
        );
        expect([transfer.get("toAccountId"), transfer.get("toAmount"), transfer.get("toCurrency")]).toStrictEqual([
            "chase",
            100,
            "USD",
        ]);
        expect(transfer.get("exchangeRate")).toBeCloseTo(0.002, 10);
        const kept = fieldsOf(rows, "f1");
        expect(kept.deletedAt).toBeNull();
        expect([kept.fields.get("accountId"), kept.fields.get("amount"), kept.fields.get("currency")]).toStrictEqual([
            "chase",
            2,
            "USD",
        ]);
    });

    it("swaps with no rate published, each account keeping its stored amount, frozen USD and fee", () => {
        const fees = [
            fee(),
            fee({ ...envelope("f2"), accountId: "banco", amount: 500, amountUsd: 1, currency: "VES" }),
        ];
        const transfer = move({ fromAmount: 33.335, fromAmountUsd: 33.3, toAmountUsd: 40 });
        const { base, doc, ledger } = baseFor(fees, transfer, []);
        const input = transferInputOf(ledger, base, swappedTransfer(base.start));
        expect(transferProblem(ledger, doc, input)).toBeNull();
        const rows = editedTransfer(ledger, doc, input, NOW);
        expect(Object.fromEntries(fieldsOf(rows, "t1").fields)).toMatchObject({
            exchangeRate: 33.335 / 50_000,
            fromAccountId: "banco",
            fromAmount: 50_000,
            fromAmountUsd: 40,
            toAccountId: "chase",
            toAmount: 33.335,
            toAmountUsd: 33.3,
        });
        expect(Object.fromEntries(fieldsOf(rows, "f1").fields)).toMatchObject({
            accountId: "chase",
            amount: 2,
            amountUsd: 2,
            currency: "USD",
        });
        expect(Object.fromEntries(fieldsOf(rows, "f2").fields)).toMatchObject({
            accountId: "banco",
            amount: 500,
            amountUsd: 1,
            currency: "VES",
        });
    });

    it("keeps a leg's and fee's stored currency when the account has since changed currency", () => {
        const transfer = move({ fromAmount: 90, fromAmountUsd: 100, fromCurrency: "EUR" });
        const { rows } = editOf([fee({ currency: "EUR" })], (values) => ({ ...values, note: "rent" }), transfer);
        expect(Object.fromEntries(fieldsOf(rows, "t1").fields)).toMatchObject({
            fromAmount: 90,
            fromAmountUsd: 100,
            fromCurrency: "EUR",
        });
        expect(Object.fromEntries(fieldsOf(rows, "f1").fields)).toMatchObject({
            amount: 2,
            amountUsd: 2,
            currency: "EUR",
        });
    });

    it("tombstones a removed fee and keeps the note and id of an edited one", () => {
        const removed = fieldsOf(
            editOf([fee()], (values) => ({ ...values, feeTexts: { destination: null, source: null } })).rows,
            "f1"
        );
        expect(removed.deletedAt).toBe(NOW);
        const edited = fieldsOf(
            editOf([fee()], (values) => ({ ...values, feeTexts: { destination: null, source: "3.00" } })).rows,
            "f1"
        );
        expect(edited.deletedAt).toBeNull();
        expect(edited.fields.get("amount")).toBe(3);
        expect(edited.fields.get("amountUsd")).toBe(3);
        expect(edited.fields.get("note")).toBe("wire");
    });

    it("adds a fee on the side's account, in its currency, linked to the transfer and to no category", () => {
        const { rows } = editOf([], (values) => ({ ...values, feeTexts: { destination: "1,000.00", source: null } }));
        const added = rows.find((row) => row.localId !== "t1");
        const fields = new Map(Object.entries(added?.fields ?? {}));
        expect(fields.get("accountId")).toBe("banco");
        expect(fields.get("currency")).toBe("VES");
        expect(fields.get("amount")).toBe(1000);
        expect(fields.get("amountUsd")).toBe(2);
        expect(fields.get("transferId")).toBe("t1");
        expect(fields.get("categoryId")).toBeNull();
    });

    it("files a moved transfer and its fee on the ledger's day, not the browser's", () => {
        const { rows } = editOf([fee()], (values) => ({ ...values, dateText: "2026-11-07T22:30" }));
        for (const id of ["t1", "f1"]) {
            const { fields } = fieldsOf(rows, id);
            expect(fields.get("date")).toBe(LATE);
            expect(fields.get("day")).toBe(Date.parse("2026-11-07T04:00:00Z"));
            expect(fields.get("month")).toBe(Date.parse("2026-11-01T04:00:00Z"));
        }
    });

    it("restores the opening amount when typing goes back, though the first edit already saved over the row", () => {
        const { base, doc, ledger } = baseFor([], move({ fromAmount: 33.335, fromAmountUsd: 33.3 }), []);
        const live = { ...doc, fromAmount: 50 };
        const rows = editedTransfer(ledger, live, transferInputOf(ledger, base, base.start), NOW);
        expect(fieldsOf(rows, "t1").fields.get("fromAmount")).toBe(33.335);
    });

    it("drops the rate when an edit leaves both legs in one currency", () => {
        const { rows } = editOf([], (values) => ({ ...values, arrivedText: "100.00", toId: "wise" }));
        const { fields } = fieldsOf(rows, "t1");
        expect(fields.get("toCurrency")).toBe("USD");
        expect(fields.get("exchangeRate")).toBe(1);
        expect(fields.get("exchangeRateType")).toBeNull();
    });
});

describe("transferProblem", () => {
    it("refuses a new fee with no rate to price it, though the legs carry their frozen USD", () => {
        const { base, doc, ledger } = baseFor(
            [],
            move({
                fromAccountId: "banco",
                fromAmount: 50_000,
                fromCurrency: "VES",
                toAccountId: "chase",
                toAmount: 100,
                toCurrency: "USD",
            }),
            []
        );
        const unfeed = transferInputOf(ledger, base, { ...base.start, note: "rent" });
        expect(transferProblem(ledger, doc, unfeed)).toBeNull();
        const feed = transferInputOf(ledger, base, {
            ...base.start,
            feeTexts: { destination: null, source: "1,000.00" },
        });
        expect(transferProblem(ledger, doc, feed)).toBe("rateMissing");
    });

    it("refuses an empty leg and the same account on both sides", () => {
        expect(editOf([], (values) => ({ ...values, sentText: "" })).problem).toBe("empty-leg");
        expect(editOf([], (values) => ({ ...values, toId: "chase" })).problem).toBe("same-account");
    });
});

describe("repriced and withAccounts", () => {
    const books = [rate("VES", 500), rate("COP", 4000)];

    it("crosses through USD and rounds the arrival to the destination's decimals", () => {
        const { base, ledger } = baseFor([], move(), books);
        const swapped = swappedTransfer(base.start);
        expect(repriced(ledger, base, base.start, "official")?.arrivedText).toBe("Bs\u00A050,000.00");
        expect(repriced(ledger, base, swapped, "official")?.arrivedText).toBe("$100.00");
    });

    it("offers no rate for a cleared date instead of throwing", () => {
        const { base, ledger } = baseFor([], move(), [rate("VES", 500)]);
        expect(repriced(ledger, base, { ...base.start, dateText: "" }, "official")).toBeNull();
    });

    it("refuses a rate nobody published", () => {
        const { base, ledger } = baseFor([], move(), books);
        expect(repriced(ledger, base, base.start, "eur_reference")).toBeNull();
    });

    it("gives one currency both amounts and no rate, and keeps a typed crossing on an account in its currency", () => {
        const { base, ledger } = baseFor([], move(), books);
        const same = withAccounts(ledger, base, base.start, "chase", "wise");
        expect([same.arrivedText, same.rateType]).toStrictEqual(["$100.00", null]);
        const typed = { ...base.start, arrivedText: "60,000.00", rateType: "custom" };
        expect(withAccounts(ledger, base, typed, "wise", "banco")).toStrictEqual({ ...typed, fromId: "wise" });
    });
});
