import type { api } from "@outlayr/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import * as Schema from "effect/Schema";

export type PulledPage = FunctionReturnType<typeof api.sync.pullSince>;
export type PulledRow = PulledPage["rows"][number];

export interface Watch<Value> {
    localQueryResult: () => Value | undefined;
    onUpdate: (listener: () => void) => () => void;
}

export interface SyncSource {
    head: () => Watch<number>;
    pull: (cursor: number) => Watch<PulledPage>;
}

export interface SyncSink {
    apply: (rows: readonly PulledRow[]) => true | Promise<void>;
    fail: (error: Error) => void;
    ready: () => void;
}

interface SyncOptions<Table extends string> {
    onStale: () => void;
    source: SyncSource;
    tables: readonly Table[];
    wait?: (ms: number) => Promise<void>;
}

interface Watching<Value> {
    heard: boolean;
    stop?: () => void;
    watch: Watch<Value>;
}

interface Pulling extends Watching<PulledPage> {
    from: number;
    seen: PulledPage | undefined;
}

const RETRY_WAITS_MS = [500, 1500, 4000, 8000];
const LAST_WAIT_MS = 8000;

const SavedCursor = Schema.Struct({ cursor: Schema.Number });
export const isSavedCursor = Schema.is(SavedCursor);

const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

export type LedgerSync<Table extends string> = ReturnType<typeof createLedgerSync<Table>>;

export function createLedgerSync<Table extends string>({ onStale, source, tables, wait = sleep }: SyncOptions<Table>) {
    const sinks = new Map<string, SyncSink>();
    const restored = new Map<string, number>();
    const reaching = new Set<{ resolve: () => void; seq: number }>();
    const awaiting = new Set<{ reject: (error: Error) => void; resolve: () => void }>();
    let phase: "idle" | "opening" | "running" | "stopped" = "idle";
    let cursor = 0;
    let vouched = 0;
    let applied = 0;
    let lagging = 0;
    let landing = Promise.resolve();
    let begun = false;
    let ready = false;
    let attempt = 0;
    let run = 0;
    let answered = false;
    let refusal: Error | undefined;
    let pull: Pulling | undefined;
    let head: Watching<number> | undefined;

    const release = () => {
        for (const each of reaching) {
            if (phase !== "running" || each.seq <= vouched) {
                reaching.delete(each);
                each.resolve();
            }
        }
    };

    const answerWith = (error?: Error) => {
        if (answered) {
            return;
        }
        answered = true;
        refusal = error;
        for (const each of awaiting) {
            if (error) {
                each.reject(error);
            } else {
                each.resolve();
            }
        }
        awaiting.clear();
    };

    const halt = (next: "idle" | "stopped", error: Error) => {
        pull?.stop?.();
        head?.stop?.();
        pull = undefined;
        head = undefined;
        phase = next;
        run += 1;
        answerWith(error);
        release();
    };

    const stop = (error: Error) => {
        const failed = [...sinks.values()];
        sinks.clear();
        halt("stopped", error);
        for (const sink of failed) {
            sink.fail(error);
        }
    };

    const startOver = () => {
        halt("stopped", new Error("The ledger copy cannot be continued"));
        onStale();
    };

    // The cursor moves when a table accepts its rows; the saved one waits until every table shows them, in order.
    const land = (to: number, receipts: readonly Promise<void>[]) => {
        if (receipts.length === 0 && lagging === 0) {
            applied = to;
            return;
        }
        const mine = run;
        lagging += 1;
        landing = landing
            .then(() => Promise.all(receipts))
            .then(() => {
                if (run === mine) {
                    applied = to;
                    lagging -= 1;
                }
            });
        landing.catch(() => undefined);
    };

    const take = (page: PulledPage) => {
        const receipts: Promise<void>[] = [];
        const fresh = page.rows.filter((row) => row.seq > cursor);
        for (const [table, rows] of Map.groupBy(fresh, (row) => row.table)) {
            const receipt = sinks.get(table)?.apply(rows);
            if (receipt !== true && receipt !== undefined) {
                receipts.push(receipt);
            }
        }
        const from = cursor;
        cursor = Math.max(cursor, page.cursor);
        if (cursor > from) {
            land(cursor, receipts);
        }
    };

    const follow = () => {
        pull?.stop?.();
        const watch = source.pull(cursor);
        const next: Pulling = { from: cursor, heard: false, seen: undefined, watch };
        pull = next;
        // Convex keeps an unsubscribed query's last result until its next message, so a watch is read only once heard.
        next.stop = watch.onUpdate(() => {
            if (pull === next) {
                next.heard = true;
                pump();
            }
        });
    };

    const retry = (failure: Error) => {
        const waitMs = RETRY_WAITS_MS[attempt];
        if (waitMs === undefined && !ready) {
            stop(failure);
            return;
        }
        attempt += 1;
        pull?.stop?.();
        pull = undefined;
        const mine = run;
        void wait(waitMs ?? LAST_WAIT_MS).then(() => {
            if (run === mine && phase === "running") {
                follow();
            }
        });
    };

    const serverSeq = () => {
        if (!head?.heard) {
            return undefined;
        }
        try {
            return head.watch.localQueryResult();
        } catch {
            return undefined;
        }
    };

    const answerReady = () => {
        if (ready) {
            return;
        }
        ready = true;
        for (const sink of sinks.values()) {
            sink.ready();
        }
        answerWith();
    };

    function pump() {
        const current = pull;
        if (phase !== "running" || !current?.heard) {
            return;
        }
        let page: PulledPage | undefined;
        try {
            page = current.watch.localQueryResult();
        } catch (error) {
            if (error instanceof ConvexError) {
                stop(error);
            } else {
                retry(error instanceof Error ? error : new Error("The ledger could not be pulled", { cause: error }));
            }
            return;
        }
        if (page === undefined) {
            return;
        }
        const nextSeq = serverSeq();
        if (nextSeq !== undefined && cursor > 0 && cursor >= nextSeq) {
            startOver();
            return;
        }
        attempt = 0;
        if (page !== current.seen) {
            current.seen = page;
            try {
                take(page);
            } catch (error) {
                stop(
                    error instanceof Error ? error : new Error("The ledger could not take its rows", { cause: error })
                );
                return;
            }
        }
        vouched = Math.max(vouched, cursor);
        if (!page.hasMore) {
            // The head counts every table, so it carries the cursor past rows of tables this pull leaves out.
            vouched = Math.max(vouched, (nextSeq ?? 0) - 1);
            answerReady();
        }
        if (cursor > current.from) {
            follow();
        }
        release();
    }

    const begin = () => {
        phase = "running";
        ready = false;
        attempt = 0;
        run += 1;
        if (begun) {
            cursor = applied;
        } else {
            begun = true;
            const cursors = new Set(tables.map((table) => restored.get(table)));
            if (cursors.size > 1) {
                startOver();
                return;
            }
            const [saved] = cursors;
            cursor = saved ?? 0;
            applied = cursor;
        }
        vouched = cursor;
        lagging = 0;
        landing = Promise.resolve();
        const watch = source.head();
        const next: Watching<number> = { heard: false, watch };
        head = next;
        next.stop = watch.onUpdate(() => {
            if (head === next) {
                next.heard = true;
                pump();
            }
        });
        follow();
    };

    return {
        attach: (table: Table, sink: SyncSink) => {
            sinks.set(table, sink);
            if (phase === "running") {
                if (ready) {
                    sink.ready();
                }
            } else {
                if (phase !== "opening") {
                    phase = "opening";
                    answered = false;
                    refusal = undefined;
                }
                if (tables.every((each) => sinks.has(each))) {
                    begin();
                }
            }
            return () => {
                if (sinks.get(table) === sink) {
                    sinks.delete(table);
                    if (sinks.size === 0) {
                        halt("idle", new Error("The ledger tables closed"));
                    }
                }
            };
        },
        reached: (seq: number) =>
            phase === "idle" || phase === "stopped" || seq <= vouched
                ? Promise.resolve()
                : new Promise<void>((resolve) => {
                      reaching.add({ resolve, seq });
                  }),
        restore: (table: Table, saved: typeof SavedCursor.Type) => {
            if (!begun) {
                restored.set(table, saved.cursor);
            }
        },
        saved: (): typeof SavedCursor.Type => ({ cursor: applied }),
        synced: () => {
            if (answered) {
                return refusal ? Promise.reject(refusal) : Promise.resolve();
            }
            return new Promise<void>((resolve, reject) => {
                awaiting.add({ reject, resolve });
            });
        },
    };
}
