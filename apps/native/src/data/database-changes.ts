import { inArray, sql } from "drizzle-orm";
import { addDatabaseChangeListener } from "expo-sqlite";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import type { META_KEYS } from "./app-meta-core";
import { SETTING_KEYS } from "./settings-core";
import type { BoolSettingKey, NumberSettingKey } from "./settings-core";
import { invalidateAll, subscribeToTable } from "./table-invalidation";

const pending = new Set<string>();
const pendingMetaRows = new Set<number>();
const settingListeners = new Map<Database, Set<SettingListener>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let nativeListener: { remove: () => void } | null = null;
let subscriberCount = 0;

type SettingKey = BoolSettingKey | NumberSettingKey | (typeof META_KEYS)["currency" | "walletCards"];

interface SettingListener {
    keys: readonly SettingKey[] | undefined;
    run: () => void;
}

function flush(): void {
    flushTimer = null;
    const tableNames = [...pending];
    const metaRows = [...pendingMetaRows];
    pending.clear();
    pendingMetaRows.clear();
    invalidateAll(tableNames);
    if (metaRows.length === 0) {
        return;
    }
    for (const [db, listeners] of settingListeners) {
        changedSettings(db, metaRows)
            .catch(() => null)
            .then((changed) => {
                for (const listener of listeners) {
                    if (settingChangeReaches(changed, listener.keys)) {
                        listener.run();
                    }
                }
            });
    }
}

// `null` when a row is already gone: it was deleted and may have been any setting.
async function changedSettings(db: Database, rowIds: number[]): Promise<ReadonlySet<string> | null> {
    const rows = await db
        .select({ key: appMeta.key })
        .from(appMeta)
        .where(inArray(sql`rowid`, rowIds));
    if (rows.length < rowIds.length) {
        return null;
    }
    return new Set(rows.map((row) => row.key).filter((key) => SETTING_KEYS.has(key)));
}

export function settingChangeReaches(changed: ReadonlySet<string> | null, keys?: readonly string[]): boolean {
    if (changed === null) {
        return true;
    }
    return keys === undefined ? changed.size > 0 : keys.some((key) => changed.has(key));
}

function startNativeListener(): void {
    nativeListener = addDatabaseChangeListener((event) => {
        pending.add(event.tableName);
        if (event.tableName === "appMeta") {
            pendingMetaRows.add(event.rowId);
        }
        flushTimer ??= setTimeout(flush, 0);
    });
}

function stopNativeListener(): void {
    nativeListener?.remove();
    nativeListener = null;
    if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    pending.clear();
    pendingMetaRows.clear();
}

function retainNativeListener(): () => void {
    if (subscriberCount === 0) {
        startNativeListener();
    }
    subscriberCount += 1;
    return () => {
        subscriberCount -= 1;
        if (subscriberCount === 0) {
            stopNativeListener();
        }
    };
}

// SQLite's update hook fires once per row, so a 1,000-row sync page would re-run every live read a thousand times.
// Events collect into one native listener and deliver next tick, once per burst.
export function subscribeToTableChanges(tableName: string, listener: () => void): () => void {
    const release = retainNativeListener();
    const unsubscribe = subscribeToTable(tableName, listener);
    return () => {
        unsubscribe();
        release();
    };
}

// `appMeta` also holds bookkeeping every sync cycle rewrites; events name a rowid, not a key, so the burst's keys are
// looked up once to wake only setting listeners.
export function subscribeToSettingChanges(
    db: Database,
    listener: () => void,
    keys?: readonly SettingKey[]
): () => void {
    const release = retainNativeListener();
    const listeners = settingListeners.get(db) ?? new Set<SettingListener>();
    const entry: SettingListener = { keys, run: listener };
    listeners.add(entry);
    settingListeners.set(db, listeners);
    return () => {
        listeners.delete(entry);
        if (listeners.size === 0) {
            settingListeners.delete(db);
        }
        release();
    };
}
