type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

/**
 * A second invalidation channel beside SQLite's per-row hook, so a batch writer repaints once and explicitly.
 * Free of `expo-sqlite` and React so `-core.ts` modules can reach it under node.
 */
export function subscribeToTable(tableName: string, listener: Listener): () => void {
    const existing = listeners.get(tableName) ?? new Set<Listener>();
    existing.add(listener);
    listeners.set(tableName, existing);

    return () => {
        const current = listeners.get(tableName);
        if (!current) {
            return;
        }
        current.delete(listener);
        if (current.size === 0) {
            listeners.delete(tableName);
        }
    };
}

export function invalidate(tableName: string): void {
    const current = listeners.get(tableName);
    if (!current) {
        return;
    }
    // oxlint-disable-next-line unicorn/no-useless-spread -- a listener can detach while being notified, which would skip the one after it
    for (const listener of [...current]) {
        listener();
    }
}

export function invalidateAll(tableNames: Iterable<string>): void {
    for (const tableName of new Set(tableNames)) {
        invalidate(tableName);
    }
}
