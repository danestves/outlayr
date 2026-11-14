import { SYNCED_TABLES } from "@outlayr/backend/confect/lib/syncTables";
import { ARCHIVE_FORMAT, ARCHIVE_VERSION } from "@outlayr/money/archive";
import { describe, expect, it } from "vite-plus/test";

import {
    archivePushes,
    buildArchive,
    deletedEntries,
    eraseRows,
    inRange,
    parseArchive,
    restoreEntryRows,
    serializeArchive,
} from "./model";
import type { PulledRow } from "./model";

const NOW = 1_800_000_000_000;
const DELETED_AT = NOW - 5000;

const entryFields = {
    accountId: "a1",
    amount: 10,
    amountUsd: 10,
    categoryId: "c1",
    currency: "USD",
    customColor: null,
    date: NOW - 1000,
    day: NOW - 1000,
    details: "long note",
    emoji: null,
    exchangeRate: null,
    exchangeRateType: null,
    feeForId: null,
    feeRate: null,
    icon: null,
    imageColor: null,
    imageKey: "key",
    income: false,
    installmentId: null,
    month: NOW - 1000,
    note: "Lunch",
    onceRecurring: false,
    paidVia: null,
    receipt: null,
    recurringAnchorDay: null,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    transferId: null,
};

const row = (
    table: PulledRow["table"],
    localId: string,
    fields: PulledRow["fields"],
    extra: Partial<PulledRow> = {}
): PulledRow => ({
    deletedAt: null,
    fields,
    localId,
    restoredAt: null,
    table,
    updatedAt: NOW - 10_000,
    ...extra,
});

const entry = (localId: string, fields: PulledRow["fields"] = {}, extra: Partial<PulledRow> = {}) =>
    row("transactions", localId, { ...entryFields, ...fields }, extra);

const NONE = new Set<string>();

describe("eraseRows", () => {
    it("scrubs live entries, leaves tombstones and keeps budgets unless everything goes", () => {
        const rows = [
            entry("live"),
            entry("gone", {}, { deletedAt: DELETED_AT }),
            row("budgets", "b1", { amount: 5 }),
            row("categories", "c1", { name: "Food" }),
        ];
        const pushed = eraseRows(rows, "transactions", NOW);
        expect(pushed.map((push) => push.localId)).toEqual(["live"]);
        expect(pushed[0]).toMatchObject({
            deletedAt: NOW,
            fields: { accountId: null, amount: 0, date: 0, details: null, imageKey: null, note: "" },
        });
        expect(eraseRows(rows, "everything", NOW).map((push) => push.localId)).toEqual(["live", "b1"]);
    });

    it("clears a balance check without tombstoning the account", () => {
        const [push] = eraseRows([row("accounts", "a1", { checkedAt: NOW - 1 })], "transactions", NOW);
        expect(push).toMatchObject({ deletedAt: null, fields: { checkedAt: null }, localId: "a1" });
    });
});

describe("deletedEntries", () => {
    it("lists what the phone lists, newest deletion first", () => {
        const rows = [
            entry("older", {}, { deletedAt: DELETED_AT - 10 }),
            entry("newer", {}, { deletedAt: DELETED_AT }),
            entry("live"),
            entry("erased", { date: 0 }, { deletedAt: DELETED_AT }),
            entry("leg", { transferId: "t1" }, { deletedAt: DELETED_AT }),
            entry("fee", { feeForId: "newer" }, { deletedAt: DELETED_AT }),
            entry("late", { installmentId: "i1" }, { deletedAt: DELETED_AT }),
            row("installments", "i1", {}, { deletedAt: DELETED_AT }),
            entry("closed", { accountId: "closed" }, { deletedAt: DELETED_AT }),
        ];
        expect(deletedEntries(rows, new Set(["closed"])).map((item) => item.localId)).toEqual(["newer", "older"]);
    });
});

describe("restoreEntryRows", () => {
    it("lifts the entry past its tombstone with its fee and order, but not rows deleted on their own", () => {
        const rows = [
            entry("e1", {}, { deletedAt: DELETED_AT }),
            entry("fee", { feeForId: "e1" }, { deletedAt: DELETED_AT }),
            entry("oldFee", { feeForId: "e1" }, { deletedAt: DELETED_AT - 99 }),
            row("installmentPlans", "p1", { transactionId: "e1" }, { deletedAt: DELETED_AT }),
            row("installments", "i1", { planId: "p1" }, { deletedAt: DELETED_AT }),
            entry("late", { installmentId: "i1" }, { deletedAt: DELETED_AT }),
        ];
        const pushed = restoreEntryRows(rows, "e1", NONE, NOW);
        expect(pushed.map((push) => push.localId).toSorted()).toEqual(["e1", "fee", "i1", "late", "p1"]);
        for (const push of pushed) {
            expect(push).toMatchObject({ deletedAt: null, restoredAt: NOW });
        }
    });

    it("stamps past a tombstone from a clock ahead of this one, so the restore still wins", () => {
        const ahead = NOW + 60_000;
        const [push] = restoreEntryRows([entry("e1", {}, { deletedAt: ahead })], "e1", NONE, NOW);
        expect(push).toMatchObject({ restoredAt: ahead + 1 });
    });

    it("refuses what the phone refuses", () => {
        const onClosed = entry("e1", { accountId: "closed" }, { deletedAt: DELETED_AT });
        expect(restoreEntryRows([onClosed], "e1", new Set(["closed"]), NOW)).toEqual([]);
        const lone = entry("fee", { feeForId: "p" }, { deletedAt: DELETED_AT });
        expect(restoreEntryRows([lone, entry("p", {}, { deletedAt: DELETED_AT })], "fee", NONE, NOW)).toEqual([]);
        const taken = [lone, entry("p"), entry("other", { feeForId: "p" })];
        expect(restoreEntryRows(taken, "fee", NONE, NOW)).toEqual([]);
    });
});

describe("parseArchive", () => {
    it("refuses anything that isn't a current archive", () => {
        expect(parseArchive("not json")).toBeNull();
        expect(parseArchive(JSON.stringify({ format: "other", tables: {}, version: 1 }))).toBeNull();
        expect(
            parseArchive(JSON.stringify({ format: ARCHIVE_FORMAT, tables: {}, version: ARCHIVE_VERSION + 1 }))
        ).toBeNull();
        expect(parseArchive(JSON.stringify({ format: ARCHIVE_FORMAT, tables: { x: 1 }, version: 1 }))).toBeNull();
    });

    it("reads a missing table as empty", () => {
        const parsed = parseArchive(JSON.stringify({ format: ARCHIVE_FORMAT, tables: {}, version: 1 }));
        expect(SYNCED_TABLES.every((table) => parsed?.tables[table].length === 0)).toBe(true);
    });
});

describe("archivePushes", () => {
    const fileOf = (rows: readonly PulledRow[]) => {
        const parsed = parseArchive(serializeArchive(buildArchive(rows, NOW)));
        if (!parsed) {
            throw new Error("the web's own archive must parse");
        }
        return parsed;
    };

    it("writes nothing when the file already matches the server", () => {
        const rows = [
            entry("e1"),
            entry("gone", {}, { deletedAt: DELETED_AT }),
            row("appMeta", "currency", { value: "USD" }),
        ];
        expect(archivePushes(fileOf(rows), rows, NOW)).toEqual([]);
    });

    it("brings back an erased ledger, past the erase's era", () => {
        const file = fileOf([entry("e1")]);
        const erased = entry("e1", { amount: 0, date: 0, note: "" }, { deletedAt: NOW - 1, updatedAt: NOW - 1 });
        const [push] = archivePushes(file, [erased], NOW) ?? [];
        expect(push).toMatchObject({
            deletedAt: null,
            fields: { amount: 10, note: "Lunch" },
            restoredAt: NOW,
            updatedAt: NOW,
        });
    });

    it("tombstones a live row the file lacks and one the file deleted", () => {
        const file = fileOf([entry("deleted", {}, { deletedAt: DELETED_AT })]);
        const pushed = archivePushes(file, [entry("deleted"), entry("extra")], NOW);
        expect(pushed?.map((push) => [push.localId, push.deletedAt])).toEqual([
            ["deleted", DELETED_AT],
            ["extra", NOW],
        ]);
    });

    it("gives an erased tombstone back the deleted entry the file holds", () => {
        const file = fileOf([entry("e1", {}, { deletedAt: DELETED_AT })]);
        const erased = entry("e1", { amount: 0, date: 0, note: "" }, { deletedAt: NOW - 1 });
        expect(archivePushes(file, [erased], NOW)?.[0]).toMatchObject({ deletedAt: NOW, fields: { note: "Lunch" } });
    });

    it("inserts a row the server has never seen", () => {
        expect(archivePushes(fileOf([entry("new")]), [], NOW)?.[0]).toMatchObject({ deletedAt: null, localId: "new" });
    });

    it("scrubs a deleted entry the file lacks, so Recently deleted cannot bring it back", () => {
        const gone = entry("gone", {}, { deletedAt: DELETED_AT });
        const pushes = archivePushes(fileOf([]), [gone], NOW);
        expect(pushes?.[0]).toMatchObject({ deletedAt: DELETED_AT, fields: { date: 0 }, localId: "gone" });
    });

    it("resets a setting the file lacks", () => {
        const pushes = archivePushes(fileOf([]), [row("appMeta", "currency", { value: "EUR" })], NOW);
        expect(pushes?.[0]).toMatchObject({ fields: { value: null }, localId: "currency" });
    });

    it("keeps separate deletions apart and one deletion together", () => {
        const first = DELETED_AT;
        const second = DELETED_AT + 1;
        const file = fileOf([
            entry("purchase", {}, { deletedAt: first }),
            entry("fee", {}, { deletedAt: second }),
            entry("order", {}, { deletedAt: second }),
        ]);
        const server = [entry("purchase"), entry("fee"), entry("order", {}, { deletedAt: second })];
        const stamp = Object.fromEntries((archivePushes(file, server, NOW) ?? []).map((p) => [p.localId, p.deletedAt]));
        expect(stamp.fee).toBe(stamp.order);
        expect(stamp.purchase).not.toBe(stamp.fee);
    });

    it("does not let a replacement stamp land on another deletion's instant", () => {
        const file = fileOf([entry("rebased", {}, { deletedAt: DELETED_AT }), entry("new", {}, { deletedAt: NOW })]);
        const erased = entry("rebased", { date: 0 }, { deletedAt: DELETED_AT });
        const stamp = Object.fromEntries(
            (archivePushes(file, [erased], NOW) ?? []).map((p) => [p.localId, p.deletedAt])
        );
        expect(stamp.new).toBe(NOW);
        expect(stamp.rebased).not.toBe(NOW);
    });

    it("resets a setting whose clock ran ahead, so the server does not refuse it", () => {
        const ahead = row("appMeta", "currency", { value: "EUR" }, { updatedAt: NOW + 50 });
        expect(archivePushes(fileOf([]), [ahead], NOW)?.[0]?.updatedAt).toBe(NOW + 51);
    });

    it("writes nothing from a file with a broken row", () => {
        const broken = parseArchive(
            JSON.stringify({
                format: ARCHIVE_FORMAT,
                tables: { transactions: [{ amount: "ten", id: "e1" }] },
                version: 5,
            })
        );
        expect(broken && archivePushes(broken, [entry("other")], NOW)).toBeNull();
    });
});

describe("inRange", () => {
    const today = new Date(2026, 9, 15, 12);
    const at = (year: number, month: number, day: number) => new Date(year, month, day, 12).getTime();

    it("matches local calendar months across a year boundary", () => {
        const january = new Date(2026, 0, 5, 12);
        expect(inRange(at(2025, 11, 31), { from: "", key: "lastMonth", to: "" }, january)).toBe(true);
        expect(inRange(at(2025, 11, 31), { from: "", key: "year", to: "" }, january)).toBe(false);
    });

    it("includes both custom ends and leaves an empty end open", () => {
        const range = { from: "2026-10-01", key: "custom" as const, to: "2026-10-15" };
        expect(inRange(at(2026, 9, 15), range, today)).toBe(true);
        expect(inRange(at(2026, 9, 16), range, today)).toBe(false);
        expect(inRange(at(2026, 9, 16), { ...range, to: "" }, today)).toBe(true);
    });
});
