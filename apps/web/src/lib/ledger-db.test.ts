import { DbClient } from "@tanstack/react-db";
import { describe, expect, it } from "vite-plus/test";

import { ledgerDependencies } from "./db";
import { LEDGER_CACHE_VERSION, snapshotOf, usableSnapshot } from "./ledger-cache";
import { ledgerBooks, preloadLedger } from "./ledger-db";
import { fakeConvex, ledgerRow as row, pagesOf, silentConvex } from "./test-convex";

const ROWS = 2500;

const hydrated = async (rows: readonly ReturnType<typeof row>[]) => {
    const source = new DbClient(ledgerDependencies(fakeConvex(pagesOf(rows))));
    await preloadLedger(source);
    return snapshotOf(source, undefined, "owner");
};

describe("ledger snapshot", () => {
    it("keeps every page of a paginated table", async () => {
        const rows = Array.from({ length: ROWS }, (_, index) => row(`t${index}`));
        const snapshot = await hydrated(rows);
        const restored = new DbClient(ledgerDependencies(silentConvex));

        restored.hydrate({ collections: snapshot.collections });
        void preloadLedger(restored);

        expect(new Set(ledgerBooks(restored).transactions.map((entry) => entry._id))).toStrictEqual(
            new Set(rows.map((entry) => entry._id))
        );
    });

    it("gives way to Convex, so a row deleted while the page was closed disappears", async () => {
        const snapshot = await hydrated([row("kept"), row("deleted")]);
        const restored = new DbClient(ledgerDependencies(fakeConvex(pagesOf([row("kept"), row("added")]))));

        restored.hydrate({ collections: snapshot.collections });
        await preloadLedger(restored);

        expect(new Set(ledgerBooks(restored).transactions.map((entry) => entry._id))).toStrictEqual(
            new Set(["added", "kept"])
        );
    });

    it("is never handed to another user or to code that reads a newer shape", () => {
        const snapshot = { collections: [], photos: undefined, userId: "owner", version: LEDGER_CACHE_VERSION };

        expect(usableSnapshot(snapshot, "owner")).toBe(snapshot);
        expect(usableSnapshot(snapshot, "someone-else")).toBeUndefined();
        expect(usableSnapshot({ ...snapshot, version: LEDGER_CACHE_VERSION - 1 }, "owner")).toBeUndefined();
    });
});
