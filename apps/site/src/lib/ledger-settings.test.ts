import { DbClient } from "@tanstack/react-db";
import { expect, it } from "vite-plus/test";

import { ledgerDependencies } from "./db";
import { ledgerCollections, preloadLedger } from "./ledger-db";
import { writeSettings } from "./ledger-settings";
import type { LedgerPusher } from "./ledger-write";
import { fakeConvex, pulled } from "./test-convex";

const stored = pulled("appMeta", "showCents", 1, { fields: { value: "true" } });

const ledgerWith = (push: LedgerPusher["mutation"]) =>
    new DbClient(ledgerDependencies(fakeConvex({ push, rows: [stored] })));

const showCents = (db: DbClient) => db.collection(ledgerCollections.appMeta).get("showCents")?.value;

it("pushes a setting as the appMeta row native writes", async () => {
    const pushes: unknown[] = [];
    const db = ledgerWith((_, args) => {
        pushes.push(args.rows);
        return Promise.resolve({ accepted: 1, nextSeq: 2, skipped: 0 });
    });
    await preloadLedger(db);

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
    await preloadLedger(db);

    const write = writeSettings(db, { showCents: "false" });
    expect(showCents(db)).toBe("false");

    await expect(write).rejects.toThrow("Pro is required");
    expect(showCents(db)).toBe("true");
});
