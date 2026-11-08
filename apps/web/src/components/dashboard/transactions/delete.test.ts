import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { deletionOf, plainEntries } from "./delete";

const NOW = 1_800_000_000_000;

const doc = (localId: string, extra: Record<string, unknown> = {}) => ({
    _creationTime: 1,
    $key: `id-${localId}`,
    $origin: "remote",
    _id: `id-${localId}`,
    accountId: "chase",
    amount: 10,
    deletedAt: null,
    deviceId: "phone",
    localId,
    note: localId,
    onceRecurring: false,
    recurringType: 0,
    seq: 7,
    updatedAt: 5,
    userId: "owner",
    ...extra,
});

const books = {
    installmentPlans: [{ transactionId: "financed" }],
    transactions: [
        doc("coffee"),
        doc("amazon"),
        doc("amazon fee", { feeForId: "amazon" }),
        doc("wire fee", { transferId: "move" }),
        doc("netflix", { recurringType: 3 }),
        doc("old netflix", { onceRecurring: true }),
        doc("anchored", { recurringAnchorDay: 12 }),
        doc("payment", { installmentId: "i1" }),
        doc("financed"),
    ],
} as unknown as Pick<LedgerBooks, "installmentPlans" | "transactions">;

describe("plainEntries", () => {
    it("leaves out anything whose delete also moves a schedule, transfer or plan", () => {
        expect([...plainEntries(books)]).toStrictEqual(["coffee", "amazon"]);
    });
});

describe("deletionOf", () => {
    it("takes an entry's card fee with it, as a tombstone native accepts", () => {
        const { count, keys, rows } = deletionOf(books, ["amazon"], NOW);

        expect(count).toBe(1);
        expect(keys).toStrictEqual(["id-amazon", "id-amazon fee"]);
        expect(rows.map((row) => row.localId)).toStrictEqual(["amazon", "amazon fee"]);
        expect(rows[0]).toMatchObject({ deletedAt: NOW, table: "transactions", updatedAt: NOW });
        expect(rows[0]?.fields).toMatchObject({ accountId: "chase", amount: 10, note: "amazon" });
        for (const key of [
            "$key",
            "$origin",
            "_id",
            "_creationTime",
            "seq",
            "userId",
            "deviceId",
            "deletedAt",
            "updatedAt",
        ]) {
            expect(rows[0]?.fields).not.toHaveProperty(key);
        }
    });

    it("skips what the web may not delete, even when asked", () => {
        const { count, rows } = deletionOf(books, ["coffee", "netflix", "payment", "wire fee", "financed"], NOW);

        expect(count).toBe(1);
        expect(rows.map((row) => row.localId)).toStrictEqual(["coffee"]);
    });
});
