import type { Database } from "./client";

/**
 * Not drizzle's `db.transaction()`: on expo-sqlite it never awaits the callback, so an async body commits empty.
 * Queued, because overlapping `withTransactionAsync` calls fail the second `BEGIN` and roll back the first caller.
 * The import is type-only: `-core.ts` modules run under node on better-sqlite3 and must not load expo-sqlite.
 */
export async function withTransaction(db: Database, task: () => Promise<void>): Promise<void> {
    const previous = queue.get(db) ?? Promise.resolve();
    const run = previous.then(() => runTransaction(db, task));
    // Only settled links queue, so a failed transaction never blocks later ones; `run` still rejects for its caller.
    const settled = run.then(noop, noop);
    queue.set(db, settled);
    try {
        await run;
    } finally {
        if (queue.get(db) === settled) {
            queue.delete(db);
        }
    }
}

/** One chain per database, so a test's better-sqlite3 client never waits on the app's. */
const queue = new WeakMap<object, Promise<void>>();

const noop = () => undefined;

async function runTransaction(db: Database, task: () => Promise<void>): Promise<void> {
    // SAFETY: drizzle types `$client` per driver; only the optional method is read, and its absence is checked.
    const client = db.$client as {
        withTransactionAsync?: (t: () => Promise<void>) => Promise<void>;
    };

    // better-sqlite3 test clients lack the async API; a test needing rollback injects one (`transfers-core.test.ts`).
    if (!client.withTransactionAsync) {
        await task();
        return;
    }

    await client.withTransactionAsync(task);
}
