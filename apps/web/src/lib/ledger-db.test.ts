import { DbClient } from "@tanstack/react-db";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vite-plus/test";

import { ledgerDependencies } from "./db";
import { LEDGER_CACHE_VERSION, snapshotOf, usableSnapshot } from "./ledger-cache";
import { ledgerBooks, ledgerCollections, preloadLedger } from "./ledger-db";
import type { PulledRow } from "./ledger-sync";
import { fakeConvex, pulled } from "./test-convex";

const ROWS = 2500;

const entry = (localId: string, seq: number, more?: Partial<PulledRow>) => pulled("transactions", localId, seq, more);

const open = (server: Parameters<typeof fakeConvex>[0]) => {
    const convex = fakeConvex(server);
    return { convex, db: new DbClient(ledgerDependencies(convex)) };
};

const synced = async (rows: readonly PulledRow[]) => {
    const tab = open({ rows });
    await preloadLedger(tab.db);
    return tab;
};

const entries = (db: DbClient) =>
    Object.fromEntries(ledgerBooks(db).transactions.map((row) => [row.localId, row.note]));

describe("ledger sync", () => {
    it("downloads a first visit page by page, each row once", async () => {
        const { convex, db } = await synced(Array.from({ length: ROWS }, (_, index) => entry(`t${index}`, index + 1)));

        expect(ledgerBooks(db).transactions).toHaveLength(ROWS);
        expect(convex.pulls).toStrictEqual([0, 1000, 2000, ROWS]);
    });

    it("applies a change made elsewhere as that row alone", async () => {
        const { convex, db } = await synced([entry("a", 1), entry("b", 2)]);
        const untouched = ledgerBooks(db).transactions.find((row) => row.localId === "a");

        convex.elsewhere(entry("b", 0, { fields: { note: "edited" } }));
        convex.elsewhere(entry("b", 0, { fields: { note: "edited twice" } }));

        expect(entries(db)).toStrictEqual({ a: "entry a", b: "edited twice" });
        expect(ledgerBooks(db).transactions.find((row) => row.localId === "a")).toBe(untouched);
        expect(convex.pulls).toStrictEqual([0, 2, 3, 4]);
    });

    it("drops a deleted entry, and keeps a deleted account as the tombstone the read model filters", async () => {
        const { convex, db } = await synced([entry("a", 1), pulled("accounts", "wallet", 2)]);

        convex.elsewhere(entry("a", 0, { deletedAt: 9 }), pulled("accounts", "wallet", 0, { deletedAt: 9 }));

        expect(entries(db)).toStrictEqual({});
        expect(ledgerBooks(db).accounts.map((row) => row.deletedAt)).toStrictEqual([9]);
    });

    it("refuses with the server's own error, again on each new load", async () => {
        const { db } = open({ refusal: new ConvexError("Pro is required") });

        await expect(preloadLedger(db)).rejects.toBeInstanceOf(ConvexError);
        await expect(preloadLedger(db)).rejects.toBeInstanceOf(ConvexError);
    });
});

describe("ledger snapshot", () => {
    it("shows the whole copy before the server answers", async () => {
        const rows = Array.from({ length: ROWS }, (_, index) => entry(`t${index}`, index + 1));
        const snapshot = snapshotOf((await synced(rows)).db, undefined, "owner");
        const restored = open({ rows });
        restored.convex.quiet();

        restored.db.hydrate({ collections: snapshot.collections });
        void preloadLedger(restored.db);

        expect(ledgerBooks(restored.db).transactions).toHaveLength(ROWS);
    });

    it("holds every ledger table, so a table declared outside the load is caught", async () => {
        const snapshot = snapshotOf((await synced([entry("kept", 1)])).db, undefined, "owner");

        expect(new Set(snapshot.collections.map((chunk) => chunk.collectionId))).toStrictEqual(
            new Set(Object.values(ledgerCollections).map((options) => options.id))
        );
    });

    it("pulls only what changed while the page was closed, and loses what was deleted", async () => {
        const before = [entry("kept", 1), entry("edited", 2), entry("deleted", 3)];
        const snapshot = snapshotOf((await synced(before)).db, undefined, "owner");
        const restored = open({
            rows: [
                entry("kept", 1),
                entry("edited", 4, { fields: { note: "new" } }),
                entry("deleted", 5, { deletedAt: 9 }),
                entry("added", 6),
            ],
        });

        restored.db.hydrate({ collections: snapshot.collections });
        expect(entries(restored.db)).toStrictEqual({
            deleted: "entry deleted",
            edited: "entry edited",
            kept: "entry kept",
        });
        await preloadLedger(restored.db);

        expect(restored.convex.pulls).toStrictEqual([3, 6]);
        expect(entries(restored.db)).toStrictEqual({ added: "entry added", edited: "new", kept: "entry kept" });
    });

    it("starts at the copy's cursor when the shell read the settings before the copy was restored", async () => {
        const before = [entry("kept", 1), pulled("appMeta", "showCents", 2, { fields: { value: "true" } })];
        const snapshot = snapshotOf((await synced(before)).db, undefined, "owner");
        const restored = open({ rows: [...before, entry("added", 3)] });

        void restored.db.collection(ledgerCollections.appMeta).preload();
        await Promise.resolve();
        restored.db.hydrate({ collections: snapshot.collections });
        await preloadLedger(restored.db);

        expect(restored.convex.pulls).toStrictEqual([2, 3]);
        expect(entries(restored.db)).toStrictEqual({ added: "entry added", kept: "entry kept" });
    });

    it("is never handed to another user or to code that reads a newer shape", () => {
        const snapshot = { collections: [], photos: undefined, userId: "owner", version: LEDGER_CACHE_VERSION };

        expect(usableSnapshot(snapshot, "owner")).toBe(snapshot);
        expect(usableSnapshot(snapshot, "someone-else")).toBeUndefined();
        expect(usableSnapshot({ ...snapshot, version: LEDGER_CACHE_VERSION - 1 }, "owner")).toBeUndefined();
    });
});
