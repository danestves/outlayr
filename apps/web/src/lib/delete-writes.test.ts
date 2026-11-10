import { occurrenceFeeId, occurrenceId } from "@outlayr/money/occurrence";
import { describe, expect, it } from "vite-plus/test";

import { deletionOf } from "./delete-writes";
import type { LedgerBooks } from "./ledger-books";

const NOW = Date.parse("2026-11-08T15:00:00Z");
const LAST_CHARGE = Date.parse("2026-10-15T15:00:00Z");

const envelope = (localId: string) => ({
    $key: localId,
    $origin: "remote",
    _creationTime: 1,
    _id: `doc-${localId}`,
    deletedAt: null,
    deviceId: "phone",
    localId,
    seq: 7,
    updatedAt: 5,
    userId: "owner",
});

const entry = (localId: string, extra: Record<string, unknown> = {}) => ({
    ...envelope(localId),
    accountId: "chase",
    amount: 10,
    amountUsd: 10,
    categoryId: "food",
    currency: "USD",
    customColor: null,
    date: LAST_CHARGE,
    day: LAST_CHARGE,
    details: null,
    emoji: null,
    exchangeRate: 1,
    exchangeRateType: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    income: false,
    month: LAST_CHARGE,
    note: localId,
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    ...extra,
});

const monthly = { onceRecurring: true, recurringAnchorDay: 15, recurringType: 3 };

const booksWith = (patch: Partial<Record<keyof LedgerBooks, unknown[]>>) =>
    ({
        appMeta: [{ key: "currency", value: "USD" }],
        exchangeRates: [],
        installmentPlans: [],
        installments: [],
        outsidePayments: [],
        transactions: [],
        transfers: [],
        ...patch,
    }) as unknown as LedgerBooks;

const idsOf = (rows: ReturnType<typeof deletionOf>["rows"]) => rows.map((row) => `${row.table}/${row.localId}`);

describe("deletionOf", () => {
    it("takes a card fee with its entry, as a tombstone the server accepts", () => {
        const { count, rows } = deletionOf(
            booksWith({ transactions: [entry("amazon"), entry("fee", { feeForId: "amazon" })] }),
            ["amazon"],
            NOW
        );

        expect(count).toBe(1);
        expect(idsOf(rows)).toStrictEqual(["transactions/fee", "transactions/amazon"]);
        expect(rows.at(-1)).toMatchObject({ deletedAt: NOW, updatedAt: NOW });
        for (const key of ["$key", "$origin", "_id", "seq", "userId", "deviceId", "deletedAt", "updatedAt"]) {
            expect(rows.at(-1)?.fields).not.toHaveProperty(key);
        }
    });

    it("sends a null account for an older row that never had one, since the push requires the field", () => {
        const { rows } = deletionOf(
            booksWith({
                transactions: [
                    entry("old", { accountId: undefined }),
                    entry("fee", { accountId: undefined, feeForId: "old" }),
                ],
            }),
            ["old"],
            NOW
        );
        for (const row of rows) {
            expect(row.fields).toMatchObject({ accountId: null });
        }
    });

    it("hands a charged schedule to the next landing, with the id every device derives and its fee", () => {
        const next = new Date(2026, 10, 15, new Date(LAST_CHARGE).getHours(), new Date(LAST_CHARGE).getMinutes());
        const { rows } = deletionOf(
            booksWith({
                transactions: [
                    entry("netflix", monthly),
                    entry("netflix fee", { amount: 2, feeForId: "netflix", feeRate: null }),
                ],
            }),
            ["netflix"],
            NOW
        );
        const id = occurrenceId("netflix", next);

        expect(idsOf(rows)).toStrictEqual([
            `transactions/${occurrenceFeeId(id)}`,
            `transactions/${id}`,
            "transactions/netflix fee",
            "transactions/netflix",
        ]);
        expect(rows[1]).toMatchObject({ deletedAt: null });
        expect(rows[1]?.fields).toMatchObject({
            amount: 10,
            amountUsd: 10,
            date: next.getTime(),
            onceRecurring: true,
            recurringAnchorDay: 15,
            recurringType: 3,
        });
        expect(rows[0]?.fields).toMatchObject({ amount: 2, feeForId: id, onceRecurring: false, recurringType: 0 });
        expect(rows.at(-1)?.fields).toMatchObject({ recurringType: 0 });
    });

    it("stops a subscription when the pending charge is what goes", () => {
        const { rows } = deletionOf(
            booksWith({ transactions: [entry("netflix", { ...monthly, date: Date.parse("2026-11-15T15:00:00Z") })] }),
            ["netflix"],
            NOW
        );
        expect(idsOf(rows)).toStrictEqual(["transactions/netflix"]);
    });

    it("leaves a successor another device already wrote alone", () => {
        const next = new Date(2026, 10, 15, new Date(LAST_CHARGE).getHours(), new Date(LAST_CHARGE).getMinutes());
        const taken = occurrenceId("netflix", next);
        const { rows } = deletionOf(
            booksWith({
                transactions: [entry("netflix", monthly), entry(taken, { deletedAt: 1, date: next.getTime() })],
            }),
            ["netflix"],
            NOW
        );
        expect(idsOf(rows)).toStrictEqual(["transactions/netflix"]);
    });

    it("deletes a transfer with its fees, by the transfer or by a fee", () => {
        const books = booksWith({
            transactions: [entry("wire", { transferId: "move" })],
            transfers: [{ ...envelope("move"), dateCreated: 1, fromAmount: 5, toAmount: 5 }],
        });
        expect(idsOf(deletionOf(books, ["move"], NOW).rows)).toStrictEqual(["transactions/wire", "transfers/move"]);
        expect(idsOf(deletionOf(books, ["wire"], NOW).rows)).toStrictEqual(["transfers/move", "transactions/wire"]);
    });

    it("deletes a financed purchase with its plan, leaving the purchase for last", () => {
        const { rows } = deletionOf(
            booksWith({
                installmentPlans: [{ ...envelope("plan"), transactionId: "macbook" }],
                installments: [{ ...envelope("i1"), planId: "plan" }],
                outsidePayments: [{ ...envelope("out"), planId: "plan" }],
                transactions: [entry("macbook"), entry("late fee", { installmentId: "i1" })],
            }),
            ["macbook"],
            NOW
        );
        expect(idsOf(rows)).toStrictEqual([
            "transactions/late fee",
            "installments/i1",
            "outsidePayments/out",
            "installmentPlans/plan",
            "transactions/macbook",
        ]);
    });
});
