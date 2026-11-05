import { DbClient } from "@tanstack/react-db";
import type { ConvexHttpClient } from "convex/browser";
import { getFunctionName } from "convex/server";
import { describe, expect, it } from "vite-plus/test";

import { ledgerDependencies, snapshotClient } from "./db";
import { ledgerBooks, preloadLedger } from "./ledger-db";

const ROWS = 2500;

const entries = Array.from({ length: ROWS }, (_, index) => ({ _id: `t${index}`, note: `entry ${index}` }));

const fakeHttp = {
    consistentQuery: async (query: Parameters<typeof getFunctionName>[0], args: Record<string, unknown>) => {
        const name = getFunctionName(query);
        if (name !== "ledger:transactions") {
            return name === "ledger:transfers" ? { continueCursor: "", isDone: true, page: [] } : [];
        }
        const { cursor, endCursor, numItems } = args.paginationOpts as {
            cursor: string | null;
            endCursor?: string;
            numItems: number;
        };
        const start = Number(cursor ?? 0);
        const end = endCursor === undefined ? Math.min(start + numItems, ROWS) : Number(endCursor);
        return { continueCursor: String(end), isDone: end >= ROWS, page: entries.slice(start, end) };
    },
} as unknown as ConvexHttpClient;

describe("snapshotClient", () => {
    it("loads every page of a paginated ledger table for the server render", async () => {
        const db = new DbClient(ledgerDependencies(snapshotClient(fakeHttp)));

        await preloadLedger(db);

        expect(new Set(ledgerBooks(db).transactions.map((row) => row._id))).toStrictEqual(
            new Set(entries.map((row) => row._id))
        );
    });
});
