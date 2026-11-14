import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useCallback, useSyncExternalStore } from "react";

export const ImportSource = Schema.Literals(["csv", "pdf", "notion", "moneyManager"]);
export type ImportSource = typeof ImportSource.Type;

const Statement = Schema.Struct({ end: Schema.Number, start: Schema.Number });

export const ImportRecord = Schema.Struct({
    /** The accounts the entries went into, so the list can name them. */
    accountIds: Schema.Array(Schema.String),
    at: Schema.Number,
    createdAccountIds: Schema.Array(Schema.String),
    createdCategoryIds: Schema.Array(Schema.String),
    currency: Schema.String,
    duplicates: Schema.Number,
    entryIds: Schema.Array(Schema.String),
    id: Schema.String,
    in: Schema.Number,
    inCount: Schema.Number,
    name: Schema.String,
    out: Schema.Number,
    outCount: Schema.Number,
    source: ImportSource,
    statement: Schema.NullOr(Statement),
    undoneAt: Schema.NullOr(Schema.Number),
});
export type ImportRecord = typeof ImportRecord.Type;

const KEY = "outlayr.imports.v1";
const decodeRecord = Schema.decodeUnknownOption(ImportRecord);
const NONE: readonly ImportRecord[] = [];

function readStored(key: string): readonly ImportRecord[] {
    try {
        const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(key) ?? "[]");
        return Array.isArray(parsed) ? parsed.flatMap((item) => Option.toArray(decodeRecord(item))) : NONE;
    } catch {
        return NONE;
    }
}

function storeFor(userId: string) {
    const key = `${KEY}:${userId}`;
    const listeners = new Set<() => void>();
    let current: readonly ImportRecord[] | null = null;
    const snapshot = () => (current ??= readStored(key));
    const commit = (next: readonly ImportRecord[]) => {
        current = next;
        try {
            globalThis.localStorage?.setItem(key, JSON.stringify(next));
        } catch {
            // Blocked or full storage keeps the history for this tab only.
        }
        for (const listener of listeners) {
            listener();
        }
    };
    return {
        add: (record: ImportRecord) => commit([record, ...snapshot().filter((row) => row.id !== record.id)]),
        change: (id: string, change: Partial<ImportRecord>) =>
            commit(snapshot().map((row) => (row.id === id ? { ...row, ...change } : row))),
        forget: (id: string) => commit(snapshot().filter((row) => row.id !== id)),
        snapshot,
        subscribe: (listener: () => void) => {
            const onStorage = (event: StorageEvent) => {
                if (event.key === key || event.key === null) {
                    current = null;
                    listener();
                }
            };
            listeners.add(listener);
            globalThis.addEventListener("storage", onStorage);
            return () => {
                listeners.delete(listener);
                globalThis.removeEventListener("storage", onStorage);
            };
        },
    };
}

export type ImportStore = ReturnType<typeof storeFor>;

const stores = new Map<string, ImportStore>();

/** History lives in this browser, per account, the way the phone keeps its last import on the device. */
export function importStore(userId: string): ImportStore {
    const store = stores.get(userId) ?? storeFor(userId);
    stores.set(userId, store);
    return store;
}

const serverSnapshot = () => NONE;

export function useImportHistory(store: ImportStore | null) {
    const subscribe = useCallback((listener: () => void) => store?.subscribe(listener) ?? (() => undefined), [store]);
    return useSyncExternalStore(subscribe, store?.snapshot ?? serverSnapshot, serverSnapshot);
}

/** Only the newest import that still stands can be undone: anything older may be built on by what came after. */
export const undoable = (records: readonly ImportRecord[]) => {
    const [latest] = records;
    return latest?.undoneAt === null ? latest : null;
};
