import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";
import { getFunctionName } from "convex/server";

import type { LedgerPusher } from "./ledger-write";

export const ledgerRow = (id: string) => ({ _id: id, localId: id, note: `entry ${id}` });

type Reply = (name: string, args: Record<string, unknown>) => unknown;

const EMPTY_PAGED = new Set(["ledger:transactionTags", "ledger:transfers"]);

export const pagesOf =
    (rows: readonly ReturnType<typeof ledgerRow>[]) => (name: string, args: Record<string, unknown>) => {
        if (name === "sync:pullSince") {
            return { cursor: 0, hasMore: false, rows: [] };
        }
        if (name !== "ledger:transactions") {
            return EMPTY_PAGED.has(name) ? { continueCursor: "", isDone: true, page: [] } : [];
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
const accepted: LedgerPusher["mutation"] = () => Promise.resolve(pushed);

export const fakeConvex = (reply: Reply, mutation = accepted) =>
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

export const silentConvex = {
    mutation: accepted,
    onUpdate: () => Object.assign(() => undefined, { getCurrentValue: () => undefined, unsubscribe: () => undefined }),
} satisfies ConvexCollectionClient & LedgerPusher;
