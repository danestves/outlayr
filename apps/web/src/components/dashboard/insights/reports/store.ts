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
const listeners = new Set<() => void>();
let current: readonly SavedReport[] | null = null;

/** One bad entry never costs the rest: each is decoded on its own and the broken ones are dropped. */
function readStored(): readonly SavedReport[] {
    try {
        const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "[]");
        return Array.isArray(parsed) ? parsed.flatMap((item) => Option.toArray(decodeSaved(item))) : NONE;
    } catch {
        return NONE;
    }
}

const snapshot = () => (current ??= readStored());

function commit(next: readonly SavedReport[]) {
    current = next;
    try {
        globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
    } catch {
        // Blocked or full storage keeps the list for this tab only.
    }
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => {
        if (event.key === KEY || event.key === null) {
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
}

export const useSavedReports = () => useSyncExternalStore(subscribe, snapshot, () => NONE);

export function saveReport(name: string, definition: Definition, now: number): SavedReport {
    const report: SavedReport = { createdAt: now, definition, id: crypto.randomUUID(), name, openedAt: now };
    commit([report, ...snapshot()]);
    return report;
}

export const changeReport = (id: string, change: Partial<Pick<SavedReport, "definition" | "name" | "openedAt">>) =>
    commit(snapshot().map((report) => (report.id === id ? { ...report, ...change } : report)));

export function duplicateReport(id: string, name: string, now: number): SavedReport | null {
    const source = snapshot().find((report) => report.id === id);
    return source ? saveReport(name, source.definition, now) : null;
}

export const deleteReport = (id: string) => commit(snapshot().filter((report) => report.id !== id));
