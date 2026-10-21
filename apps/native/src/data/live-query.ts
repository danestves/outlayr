import { getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { useCallback, useRef, useSyncExternalStore } from "react";

import { subscribeToTableChanges } from "./database-changes";
import { subscribeRatesRevision } from "./rates-revision";
import { sameRows } from "./same-rows";
import { useTabPaused } from "./tab-pause";
import { readNow } from "./use-now";

export interface SyncQuery<TRow> {
    all: () => TRow[];
}

// Equals no value, so React's change check re-renders and the render reads instead.
const SKIPPED_READ = Symbol("skipped read");

interface Snapshot<TValue> {
    deps: readonly unknown[];
    followsClock: boolean;
    revision: number;
    value: TValue;
}

function sameDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
    return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

// Reads during render, unlike drizzle's `useLiveQuery` which seeds `[]` from an effect: empty means an empty table.
// Only writes to `table` invalidate, so rows depending on another table take it through `deps` (see `useCategoryMeta`).
// `clock` is the query's `useNow()` bound; while it follows that reading, React's change check skips the stale read.
export function useLiveQuery<TRow extends object>(
    table: SQLiteTable,
    build: () => SyncQuery<TRow>,
    deps: readonly unknown[] = [],
    clock?: number
): TRow[] {
    return useLiveRead(table, () => build().all(), deps, sameRows, clock);
}

// `select` must be pure and return something `Object.is` can compare, so a write that leaves the derived value alone
// re-renders nothing.
export function useLiveValue<TRow, TValue>(
    table: SQLiteTable,
    build: () => SyncQuery<TRow>,
    select: (rows: TRow[]) => TValue,
    deps: readonly unknown[] = []
): TValue {
    return useLiveRead(table, () => select(build().all()), deps);
}

// `read` gets its previous value when only `deps` changed with no write reported in between; otherwise null.
export function useLiveRead<TValue>(
    table: SQLiteTable,
    read: (previous: TValue | null) => TValue,
    deps: readonly unknown[],
    equal?: (cached: TValue, next: TValue) => boolean,
    clock?: number
): TValue {
    const tableName = getTableName(table);
    const subscribeTable = useCallback((bump: () => void) => subscribeToTableChanges(tableName, bump), [tableName]);
    return useRead(subscribeTable, read, deps, equal, clock);
}

export function useRatesRead<TValue>(read: () => TValue, deps: readonly unknown[] = []): TValue {
    return useRead(subscribeRatesRevision, read, deps);
}

function useRead<TValue>(
    subscribeChanges: (bump: () => void) => () => void,
    read: (previous: TValue | null) => TValue,
    deps: readonly unknown[],
    equal?: (cached: TValue, next: TValue) => boolean,
    clock?: number
): TValue {
    const revision = useRef(0);
    const snapshot = useRef<Snapshot<TValue> | null>(null);
    const inChangeCheck = useRef(false);
    const subscribePaused = useTabPaused(subscribeChanges);

    const subscribe = useCallback(
        (onStoreChange: () => void) =>
            subscribePaused(() => {
                revision.current += 1;
                inChangeCheck.current = true;
                try {
                    onStoreChange();
                } finally {
                    inChangeCheck.current = false;
                }
            }),
        [subscribePaused]
    );

    // React calls this every render: return the identical value until invalidated, or re-reading here loops forever.
    const getSnapshot = (): TValue | typeof SKIPPED_READ => {
        const cached = snapshot.current;
        if (cached !== null && cached.revision === revision.current && sameDeps(cached.deps, deps)) {
            return cached.value;
        }
        // The change check runs the committed closure: when its read followed the
        // clock and the clock has moved since, these `deps` are stale and the render
        // reads anyway. A render never skips: one whose bound stays put would loop.
        if (inChangeCheck.current && cached?.followsClock && clock !== readNow()) {
            return SKIPPED_READ;
        }
        const next = read(cached !== null && cached.revision === revision.current ? cached.value : null);
        const value = cached !== null && equal?.(cached.value, next) ? cached.value : next;
        snapshot.current = { deps, followsClock: clock === readNow(), revision: revision.current, value };
        return value;
    };

    const value = useSyncExternalStore(subscribe, getSnapshot);
    if (value === SKIPPED_READ) {
        throw new Error("A live read was skipped outside React's change check");
    }
    return value;
}
