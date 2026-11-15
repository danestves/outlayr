import { DbClient } from "@tanstack/react-db";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vite-plus/test";

import { ledgerDependencies } from "./db";
import { ledgerBooks, ledgerCollections, ledgerSeed, preloadLedger, rowStore } from "./ledger-db";
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

const seedOf = (rows: readonly PulledRow[]) => ({
    collections: ledgerSeed(rows, Math.max(0, ...rows.map((row) => row.seq)), []),
});

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

describe("server seed", () => {
    it("shows every seeded row before the browser's own pull answers", async () => {
        const rows = Array.from({ length: ROWS }, (_, index) => entry(`t${index}`, index + 1));
        const browser = open({ rows });
        browser.convex.quiet();

        browser.db.hydrate(seedOf(rows));
        void preloadLedger(browser.db);

        expect(ledgerBooks(browser.db).transactions).toHaveLength(ROWS);
    });

    it("holds every ledger table, so a table declared outside the load is caught", () => {
        expect(new Set(seedOf([entry("kept", 1)]).collections.map((chunk) => chunk.collectionId))).toStrictEqual(
            new Set(Object.values(ledgerCollections).map((options) => options.id))
        );
    });

    it("drops a row deleted between the server's pull pages", () => {
        const browser = open({ rows: [] });

        browser.db.hydrate(
            seedOf([entry("kept", 1), entry("deleted", 2), entry("edited", 3), entry("deleted", 4, { deletedAt: 9 })])
        );

        expect(entries(browser.db)).toStrictEqual({ edited: "entry edited", kept: "entry kept" });
    });

    it("tells a screen when a row it painted from the server page is deleted", async () => {
        const rows = [entry("kept", 1), entry("deleted", 2)];
        const browser = open({ rows });
        browser.db.hydrate(seedOf(rows));
        const store = rowStore(browser.db.collection(ledgerCollections.transactions));
        const stop = store.subscribe(() => undefined);
        await preloadLedger(browser.db);

        browser.convex.elsewhere(entry("deleted", 0, { deletedAt: 9 }));
        await Promise.resolve();

        expect(store.read().map((row) => row.localId)).toStrictEqual(["kept"]);
        stop();
    });

    it("pulls only what changed after the server rendered, and loses what was deleted", async () => {
        const before = [entry("kept", 1), entry("edited", 2), entry("deleted", 3)];
        const browser = open({
            rows: [
                entry("kept", 1),
                entry("edited", 4, { fields: { note: "new" } }),
                entry("deleted", 5, { deletedAt: 9 }),
                entry("added", 6),
            ],
        });

        browser.db.hydrate(seedOf(before));
        expect(entries(browser.db)).toStrictEqual({
            deleted: "entry deleted",
            edited: "entry edited",
            kept: "entry kept",
        });
        await preloadLedger(browser.db);

        expect(browser.convex.pulls).toStrictEqual([3, 6]);
        expect(entries(browser.db)).toStrictEqual({ added: "entry added", edited: "new", kept: "entry kept" });
    });

    it("starts at the seed's cursor when a table opened before the seed arrived", async () => {
        const before = [entry("kept", 1), pulled("appMeta", "showCents", 2, { fields: { value: "true" } })];
        const browser = open({ rows: [...before, entry("added", 3)] });

        void browser.db.collection(ledgerCollections.appMeta).preload();
        await Promise.resolve();
        browser.db.hydrate(seedOf(before));
        await preloadLedger(browser.db);

        expect(browser.convex.pulls).toStrictEqual([2, 3]);
        expect(entries(browser.db)).toStrictEqual({ added: "entry added", kept: "entry kept" });
    });
});
