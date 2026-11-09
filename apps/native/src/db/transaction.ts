import { sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";

import type { SpendDb } from "@/data/budget-spent";

import type { Database } from "./client";

export function bootTransaction(db: Database, task: () => void): void {
    db.run(sql`BEGIN`);
    try {
        task();
        db.run(sql`COMMIT`);
    } catch (error) {
        try {
            db.run(sql`ROLLBACK`);
            // oxlint-disable-next-line no-empty -- SQLite already rolled back after a disk or I/O failure, so keep the original error
        } catch {}
        throw error;
    }
}

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

const repairs = new WeakMap<SpendDb, (() => void)[]>();

/** Runs `repair` again once the open transaction has rolled back, so it must be idempotent. */
export function afterRollback(db: SpendDb, repair: () => void): void {
    repairs.get(db)?.push(repair);
}

async function runTransaction(db: Database, task: () => Promise<void>): Promise<void> {
    // SAFETY: drizzle types `$client` per driver; only the optional method is read, and its absence is checked.
    const client = db.$client as {
        withTransactionAsync?: (t: () => Promise<void>) => Promise<void>;
    };
    const pending: (() => void)[] = [];
    repairs.set(db, pending);
    try {
        // better-sqlite3 test clients lack the async API; a test needing rollback injects `withAsyncTransactions`.
        await (client.withTransactionAsync ? client.withTransactionAsync(task) : task());
    } catch (error) {
        repairs.delete(db);
        for (const repair of pending) {
            try {
                repair();
                // oxlint-disable-next-line no-empty -- the transaction's own failure is the one to report; the next read repairs again
            } catch {}
        }
        throw error;
    } finally {
        repairs.delete(db);
    }
}

class BodyFailedError extends Error {
    override name = "BodyFailedError";
}

export const transaction = <A, E, R, E2>(
    db: Database,
    body: Effect.Effect<A, E, R>,
    toError: (cause: unknown) => E2
): Effect.Effect<A, E | E2, R> =>
    Effect.uninterruptible(
        Effect.gen(function* runInTransaction() {
            const run = Effect.runPromiseExitWith(yield* Effect.context<R>());
            let exit: Exit.Exit<A, E> | undefined;
            const committed = yield* Effect.exit(
                Effect.tryPromise({
                    catch: toError,
                    try: () =>
                        withTransaction(db, async () => {
                            exit = await run(body);
                            if (Exit.isFailure(exit)) {
                                throw new BodyFailedError();
                            }
                        }),
                })
            );
            if (exit !== undefined && Exit.isFailure(exit)) {
                return yield* Effect.failCause(exit.cause);
            }
            if (Exit.isFailure(committed)) {
                return yield* Effect.failCause(committed.cause);
            }
            return yield* exit ?? Effect.die(new Error("A committed transaction never ran its body"));
        })
    );
