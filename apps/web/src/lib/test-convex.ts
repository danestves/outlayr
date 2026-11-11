import type { ConvexReactClient } from "convex/react";
import { getFunctionName } from "convex/server";

import type { LedgerConvex } from "./db";
import type { PulledPage, PulledRow } from "./ledger-sync";
import type { LedgerPusher } from "./ledger-write";

type Push = LedgerPusher["mutation"];

interface Watched {
    args: Record<string, unknown>;
    listener: (() => void) | undefined;
    name: string;
    result: unknown;
}

interface Server {
    pageSize?: number;
    push?: Push;
    refusal?: unknown;
    rows?: readonly PulledRow[];
}

// SAFETY: a fixture. The sync reads the envelope, and each test names the fields it checks.
export const pulled = (table: PulledRow["table"], localId: string, seq: number, more: Partial<PulledRow> = {}) =>
    ({
        deletedAt: null,
        deviceId: "phone",
        fields: { note: `entry ${localId}` },
        localId,
        restoredAt: null,
        seq,
        table,
        updatedAt: seq,
        ...more,
    }) as PulledRow;

const DEFAULT_PAGE = 1000;

export function fakeConvex({ pageSize = DEFAULT_PAGE, push, refusal, rows = [] }: Server = {}) {
    const stored = new Map(rows.map((row) => [`${row.table}/${row.localId}`, row]));
    const watching = new Set<Watched>();
    const pulls: number[] = [];
    let nextSeq = Math.max(0, ...rows.map((row) => row.seq)) + 1;
    let silent = false;

    const pageOf = (cursor: number, tables: readonly string[]): PulledPage => {
        const newer = [...stored.values()]
            .filter((row) => row.seq > cursor && tables.includes(row.table))
            .toSorted((a, b) => a.seq - b.seq);
        const page = newer.slice(0, pageSize);
        return { cursor: page.at(-1)?.seq ?? cursor, hasMore: newer.length >= pageSize, rows: page };
    };

    const answerOf = ({ args, name }: Watched): unknown => {
        if (name === "sync:currentSeq") {
            return nextSeq;
        }
        if (name !== "sync:pullSince") {
            return [];
        }
        if (refusal !== undefined) {
            return refusal;
        }
        // SAFETY: a fixture; the sync is the only caller of this query.
        const { cursor, tables } = args as { cursor: number; tables: string[] };
        return pageOf(cursor, tables);
    };

    const publish = () => {
        if (silent) {
            return;
        }
        const changed = [...watching].filter((watched) => {
            const result = answerOf(watched);
            const moved = JSON.stringify(result) !== JSON.stringify(watched.result) || result === refusal;
            if (moved) {
                watched.result = result;
            }
            return moved;
        });
        for (const watched of changed) {
            watched.listener?.();
        }
    };

    const stamp = (row: Omit<PulledRow, "seq">) => {
        stored.set(`${row.table}/${row.localId}`, { ...row, seq: nextSeq });
        nextSeq += 1;
    };

    const accept: Push = (_mutation, { deviceId, rows: sent }) => {
        let accepted = 0;
        for (const row of sent) {
            const held = stored.get(`${row.table}/${row.localId}`);
            if (!held || held.updatedAt < row.updatedAt) {
                accepted += 1;
                stamp({
                    deletedAt: row.deletedAt,
                    deviceId,
                    fields: row.fields,
                    localId: row.localId,
                    restoredAt: ("restoredAt" in row ? row.restoredAt : null) ?? null,
                    table: row.table,
                    updatedAt: row.updatedAt,
                });
            }
        }
        publish();
        return Promise.resolve({ accepted, nextSeq, skipped: sent.length - accepted });
    };

    const watchQuery: ConvexReactClient["watchQuery"] = (query, ...[args]) => {
        const watched: Watched = {
            args: args ?? {},
            listener: undefined,
            name: getFunctionName(query),
            result: undefined,
        };
        if (watched.name === "sync:pullSince") {
            pulls.push(Number(watched.args.cursor));
        }
        return {
            journal: () => undefined,
            localQueryLogs: () => undefined,
            localQueryResult: () => {
                if (refusal !== undefined && watched.result === refusal) {
                    throw refusal;
                }
                // SAFETY: a fixture; answerOf returns what the named query returns.
                return watched.result as never;
            },
            onUpdate: (listener) => {
                watched.listener = listener;
                watching.add(watched);
                queueMicrotask(publish);
                return () => {
                    watching.delete(watched);
                };
            },
        };
    };

    return {
        elsewhere: (...changed: readonly PulledRow[]) => {
            for (const row of changed) {
                stamp(row);
            }
            publish();
        },
        mutation: push ?? accept,
        pulls,
        quiet: () => {
            silent = true;
        },
        speak: () => {
            silent = false;
            publish();
        },
        watchQuery,
    } satisfies LedgerConvex & Record<string, unknown>;
}
