import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";
import { DbClient } from "@tanstack/react-db";
import { getFunctionName } from "convex/server";
import { expect, it } from "vite-plus/test";

import { ledgerDependencies } from "./db";
import { ledgerCollections } from "./ledger-db";
import { writeSettings } from "./ledger-settings";
import type { LedgerPusher } from "./ledger-write";

const stored = {
    deletedAt: null,
    deviceId: "phone",
    fields: { value: "true" },
    localId: "showCents",
    restoredAt: null,
    seq: 1,
    table: "appMeta",
    updatedAt: 1,
} as const;

const ledgerWith = (mutation: LedgerPusher["mutation"]) => {
    const convex = {
        mutation,
        onUpdate: (query, _args, callback) => {
            const page =
                getFunctionName(query) === "sync:pullSince" ? { cursor: 1, hasMore: false, rows: [stored] } : [];
            queueMicrotask(() => callback(page as never));
            return Object.assign(() => undefined, {
                getCurrentValue: () => page as never,
                unsubscribe: () => undefined,
            });
        },
    } satisfies ConvexCollectionClient & LedgerPusher;
    return new DbClient(ledgerDependencies(convex));
};

const showCents = (db: DbClient) => db.collection(ledgerCollections.appMeta).get("showCents")?.value;

it("pushes a setting as the appMeta row native writes", async () => {
    const pushes: unknown[] = [];
    const db = ledgerWith((_, args) => {
        pushes.push(args.rows);
        return Promise.resolve({ accepted: 1, nextSeq: 2, skipped: 0 });
    });
    await db.collection(ledgerCollections.appMeta).preload();

    await writeSettings(db, { showCents: "false" });

    expect(pushes).toStrictEqual([
        [
            {
                deletedAt: null,
                fields: { value: "false" },
                localId: "showCents",
                table: "appMeta",
                updatedAt: expect.any(Number),
            },
        ],
    ]);
});

it("puts a refused setting back and says so", async () => {
    const db = ledgerWith(() => Promise.reject(new Error("Pro is required")));
    await db.collection(ledgerCollections.appMeta).preload();

    const write = writeSettings(db, { showCents: "false" });
    expect(showCents(db)).toBe("false");

    await expect(write).rejects.toThrow("Pro is required");
    expect(showCents(db)).toBe("true");
});
