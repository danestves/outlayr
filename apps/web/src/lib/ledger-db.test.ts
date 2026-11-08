import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";
import { DbClient } from "@tanstack/react-db";
import { getFunctionName } from "convex/server";
import { describe, expect, it } from "vite-plus/test";

import { ledgerDependencies } from "./db";
import { LEDGER_CACHE_VERSION, snapshotOf, usableSnapshot } from "./ledger-cache";
import { ledgerBooks, preloadLedger } from "./ledger-db";
import type { LedgerPusher } from "./ledger-write";

const row = (id: string) => ({ _id: id, note: `entry ${id}` });
const ROWS = 2500;

type Reply = (name: string, args: Record<string, unknown>) => unknown;

const pagesOf = (rows: readonly ReturnType<typeof row>[]) => (name: string, args: Record<string, unknown>) => {
    if (name === "sync:pullSince") {
        return { cursor: 0, hasMore: false, rows: [] };
    }
    if (name !== "ledger:transactions") {
        return name === "ledger:transfers" ? { continueCursor: "", isDone: true, page: [] } : [];
    }
    const { cursor, endCursor, numItems } = args.paginationOpts as {
        cursor: string | null;
        endCursor?: string;
        numItems: number;
    };
    const start = Number(cursor ?? 0);
    const end = endCursor === undefined ? Math.min(start + numItems, rows.length) : Number(endCursor);
    return { continueCursor: String(end), isDone: end >= rows.length, page: rows.slice(start, end) };
};

const pushed = { accepted: 0, nextSeq: 0, skipped: 0 };
const mutation = () => Promise.resolve(pushed);

const fakeConvex = (reply: Reply) =>
    ({
        mutation,
        onUpdate: (query, args, callback) => {
            let current: unknown;
            queueMicrotask(() => {
                current = reply(getFunctionName(query), args as Record<string, unknown>);
                callback(current as never);
            });
            return Object.assign(() => undefined, {
                getCurrentValue: () => current as never,
                unsubscribe: () => undefined,
            });
        },
    }) satisfies ConvexCollectionClient & LedgerPusher;

const silentConvex = {
    mutation,
    onUpdate: () => Object.assign(() => undefined, { getCurrentValue: () => undefined, unsubscribe: () => undefined }),
} satisfies ConvexCollectionClient & LedgerPusher;

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
