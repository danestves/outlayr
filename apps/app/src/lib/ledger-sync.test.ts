import { ConvexError } from "convex/values";
import { describe, expect, it, vi } from "vite-plus/test";

import { createLedgerSync } from "./ledger-sync";
import type { PulledPage, PulledRow, Watch } from "./ledger-sync";
import { pulled } from "./test-convex";

const TABLES = ["accounts", "transactions"] as const;

interface Kept<Value> {
    error?: unknown;
    value?: Value;
}

function asked<Value>(kept: Kept<Value> = {}) {
    let { error, value } = kept;
    let listener = () => {};
    let left = false;
    const watch: Watch<Value> = {
        localQueryResult: () => {
            if (error !== undefined) {
                throw error;
            }
            return value;
        },
        onUpdate: (heard) => {
            listener = heard;
            return () => {
                left = true;
            };
        },
    };
    return {
        answer: (next: Value) => {
            error = undefined;
            value = next;
            listener();
        },
        fail: (next: unknown) => {
            error = next;
            listener();
        },
        kept: (): Kept<Value> => ({ error, value }),
        left: () => left,
        watch,
    };
}

const page = (cursor: number, rows: readonly PulledRow[] = [], hasMore = false): PulledPage => ({
    cursor,
    hasMore,
    rows: [...rows],
});

const turn = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

function openTab({ held = false, restored }: { held?: boolean; restored?: readonly (number | undefined)[] } = {}) {
    const pulls: (ReturnType<typeof asked<PulledPage>> & { cursor: number })[] = [];
    const head = asked<number>();
    const taken: number[] = [];
    const failures: unknown[] = [];
    const shown: (() => void)[] = [];
    const waited: (() => void)[] = [];
    const ready = vi.fn<() => void>();
    const onStale = vi.fn<() => void>();
    const sync = createLedgerSync({
        onStale,
        source: {
            head: () => head.watch,
            pull: (cursor) => {
                const before = pulls.findLast((each) => each.cursor === cursor);
                const pull = { ...asked<PulledPage>(before?.kept()), cursor };
                pulls.push(pull);
                return pull.watch;
            },
        },
        tables: TABLES,
        wait: () =>
            new Promise<void>((resolve) => {
                waited.push(resolve);
            }),
    });
    for (const [index, table] of TABLES.entries()) {
        const cursor = restored?.[index];
        if (cursor !== undefined) {
            sync.restore(table, { cursor });
        }
        sync.attach(table, {
            apply: (rows) => {
                taken.push(...rows.map((row) => row.seq));
                return held
                    ? new Promise<void>((resolve) => {
                          shown.push(resolve);
                      })
                    : true;
            },
            fail: (error) => failures.push(error),
            ready,
        });
    }
    return {
        cursors: () => pulls.map((pull) => pull.cursor),
        failures,
        head,
        onStale,
        pull: () => {
            const last = pulls.at(-1);
            if (!last) {
                throw new Error("the sync never asked for rows");
            }
            return last;
        },
        ready,
        show: async () => {
            for (const each of shown.splice(0)) {
                each();
            }
            await turn();
        },
        sync,
        taken,
        waitEnds: async () => {
            waited.shift()?.();
            await turn();
        },
    };
}

const entry = (localId: string, seq: number) => pulled("transactions", localId, seq);
const account = (localId: string, seq: number) => pulled("accounts", localId, seq);

describe("ledger sync", () => {
    it("follows hasMore from page to page, takes each row once, and is ready at the last page", async () => {
        const tab = openTab();

        tab.pull().answer(page(2, [entry("a", 1), account("b", 2)], true));
        expect(tab.ready).not.toHaveBeenCalled();
        tab.pull().answer(page(3, [entry("c", 3)]));

        expect(tab.taken).toStrictEqual([1, 2, 3]);
        expect(tab.cursors()).toStrictEqual([0, 2, 3]);
        expect(tab.ready).toHaveBeenCalledTimes(TABLES.length);
        await expect(tab.sync.synced()).resolves.toBeUndefined();
    });

    it("starts at the cursor saved with the copy", () => {
        const tab = openTab({ restored: [40, 40] });

        expect(tab.cursors()).toStrictEqual([40]);
        expect(tab.sync.saved()).toStrictEqual({ cursor: 40 });
    });

    it("drops a copy that was saved for another set of tables", () => {
        const tab = openTab({ restored: [40, undefined] });

        expect(tab.onStale).toHaveBeenCalledOnce();
        expect(tab.cursors()).toStrictEqual([]);
    });

    it("takes nothing from a result it has seen, or from a pull it has left", () => {
        const tab = openTab();
        const first = tab.pull();
        first.answer(page(2, [entry("a", 1), account("b", 2)]));

        first.answer(page(1, [entry("a", 1)]));
        tab.pull().answer(page(2, [entry("a", 1), account("b", 2)]));

        expect(first.left()).toBe(true);
        expect(tab.taken).toStrictEqual([1, 2]);
        expect(tab.cursors()).toStrictEqual([0, 2]);
        expect(tab.sync.saved()).toStrictEqual({ cursor: 2 });
    });

    it("ends on a refusal: every table fails and nothing waits on it", async () => {
        const tab = openTab();
        const refusal = new ConvexError("Pro is required");
        const reached = tab.sync.reached(9);

        tab.pull().fail(refusal);

        expect(tab.failures).toStrictEqual([refusal, refusal]);
        expect(tab.pull().left()).toBe(true);
        await expect(tab.sync.synced()).rejects.toBe(refusal);
        await expect(reached).resolves.toBeUndefined();
    });

    it("asks a busy server again, and reads the answer instead of the failure it kept", async () => {
        const tab = openTab();
        const busy = tab.pull();
        busy.fail(new Error("busy"));
        await tab.waitEnds();

        tab.head.answer(1);
        expect(tab.cursors()).toStrictEqual([0, 0]);
        expect(busy.left()).toBe(true);
        expect(tab.failures).toStrictEqual([]);
        tab.pull().answer(page(1, [entry("a", 1)]));

        expect(tab.taken).toStrictEqual([1]);
        expect(tab.ready).toHaveBeenCalledTimes(TABLES.length);
    });

    it("gives up on a server that stays busy before the first answer", async () => {
        const tab = openTab();
        const busy = new Error("busy");

        for (const _wait of [500, 1500, 4000, 8000]) {
            tab.pull().fail(busy);
            await tab.waitEnds();
        }
        expect(tab.failures).toStrictEqual([]);
        tab.pull().fail(busy);

        expect(tab.failures).toStrictEqual([busy, busy]);
        await expect(tab.sync.synced()).rejects.toBe(busy);
    });

    it("starts over when the server's seq is behind the saved cursor", () => {
        const tab = openTab({ restored: [40, 40] });

        tab.head.answer(12);
        tab.pull().answer(page(40));

        expect(tab.onStale).toHaveBeenCalledOnce();
        expect(tab.ready).not.toHaveBeenCalled();
        expect(tab.pull().left()).toBe(true);
    });

    it("keeps a copy whose cursor is the last seq the server handed out", () => {
        const tab = openTab({ restored: [40, 40] });

        tab.head.answer(41);
        tab.pull().answer(page(40));

        expect(tab.onStale).not.toHaveBeenCalled();
        expect(tab.ready).toHaveBeenCalledTimes(TABLES.length);
    });

    it("says a pushed seq is reached when its row is handed to the table, before the table shows it", async () => {
        const tab = openTab({ held: true });
        tab.pull().answer(page(0));
        const reached = vi.fn<() => void>();
        void tab.sync.reached(1).then(reached);
        await turn();
        expect(reached).not.toHaveBeenCalled();

        tab.pull().answer(page(1, [entry("a", 1)]));
        await turn();

        expect(reached).toHaveBeenCalledOnce();
    });

    it("lets the server's seq vouch for a push to a table it does not pull", async () => {
        const tab = openTab();
        tab.head.answer(1);
        tab.pull().answer(page(0));
        const reached = vi.fn<() => void>();
        void tab.sync.reached(1).then(reached);
        await turn();
        expect(reached).not.toHaveBeenCalled();

        tab.head.answer(2);
        await turn();

        expect(reached).toHaveBeenCalledOnce();
        expect(tab.cursors()).toStrictEqual([0]);
    });

    it("saves a cursor only once every table shows the rows up to it", async () => {
        const tab = openTab({ held: true });

        tab.pull().answer(page(2, [entry("a", 1), account("b", 2)]));
        expect(tab.sync.saved()).toStrictEqual({ cursor: 0 });
        await tab.show();

        expect(tab.sync.saved()).toStrictEqual({ cursor: 2 });
    });
});
