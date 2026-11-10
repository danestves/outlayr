import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useSyncExternalStore } from "react";

import { Definition } from "./model";

const KEY = "outlayr.reports.v1";

const SavedReport = Schema.Struct({
    createdAt: Schema.Number,
    definition: Definition,
    id: Schema.String,
    name: Schema.NonEmptyString,
    openedAt: Schema.Number,
});

export type SavedReport = typeof SavedReport.Type;

const decodeSaved = Schema.decodeUnknownOption(SavedReport);

const NONE: readonly SavedReport[] = [];

/** One bad entry never costs the rest: each is decoded on its own and the broken ones are dropped. */
function readStored(key: string): readonly SavedReport[] {
    try {
        const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(key) ?? "[]");
        return Array.isArray(parsed) ? parsed.flatMap((item) => Option.toArray(decodeSaved(item))) : NONE;
    } catch {
        return NONE;
    }
}

function storeFor(userId: string) {
    const key = `${KEY}:${userId}`;
    const listeners = new Set<() => void>();
    let current: readonly SavedReport[] | null = null;
    const snapshot = () => (current ??= readStored(key));
    const commit = (next: readonly SavedReport[]) => {
        current = next;
        try {
            globalThis.localStorage?.setItem(key, JSON.stringify(next));
        } catch {
            // Blocked or full storage keeps the list for this tab only.
        }
        for (const listener of listeners) {
            listener();
        }
    };
    const save = (name: string, definition: Definition, now: number): SavedReport => {
        const report: SavedReport = { createdAt: now, definition, id: crypto.randomUUID(), name, openedAt: now };
        commit([report, ...snapshot()]);
        return report;
    };
    return {
        change: (id: string, change: Partial<Pick<SavedReport, "definition" | "name" | "openedAt">>) =>
            commit(snapshot().map((report) => (report.id === id ? { ...report, ...change } : report))),
        duplicate: (id: string, name: string, now: number) => {
            const source = snapshot().find((report) => report.id === id);
            return source ? save(name, source.definition, now) : null;
        },
        remove: (id: string) => commit(snapshot().filter((report) => report.id !== id)),
        save,
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

type ReportStore = ReturnType<typeof storeFor>;

const stores = new Map<string, ReportStore>();

/** The list lives in the browser, so each account keeps its own: a second account here never reads the first's. */
export function reportStore(userId: string): ReportStore {
    const store = stores.get(userId) ?? storeFor(userId);
    stores.set(userId, store);
    return store;
}

export const useSavedReports = (store: ReportStore) =>
    useSyncExternalStore(store.subscribe, store.snapshot, () => NONE);
