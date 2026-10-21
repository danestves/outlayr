let revision = 0;
const listeners = new Set<() => void>();

// A refresh wipes rates with an unqualified `DELETE FROM exchangeRates`, which SQLite's truncate optimization exempts
// from the update hook `addDatabaseChangeListener` uses (vendored `sqlite3.h:7090-7095`). This counter is that missing
// signal, threaded through the `deps` of the hooks that read rates.
export function ratesRevision(): number {
    return revision;
}

export function bumpRatesRevision(): void {
    revision += 1;
    for (const listener of listeners) {
        listener();
    }
}

export function subscribeRatesRevision(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
