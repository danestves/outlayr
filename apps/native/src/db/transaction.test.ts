import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import type { Database } from "./client";
import { transaction, withTransaction } from "./transaction";

/** Like expo-sqlite: `BEGIN` inside an open transaction fails, as SQLite does on one connection. */
function fakeClient(log: string[]) {
    let open = false;
    return {
        withTransactionAsync: async (task: () => Promise<void>) => {
            if (open) {
                throw new Error("cannot start a transaction within a transaction");
            }
            open = true;
            log.push("BEGIN");
            try {
                await task();
                log.push("COMMIT");
            } catch (error) {
                log.push("ROLLBACK");
                throw error;
            } finally {
                open = false;
            }
        },
    };
}

function database(log: string[]): Database {
    return { $client: fakeClient(log) } as unknown as Database;
}

const tick = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

describe("withTransaction", () => {
    it("runs overlapping callers one after another on the same database", async () => {
        const log: string[] = [];
        const db = database(log);

        await Promise.all([
            withTransaction(db, async () => {
                log.push("sync 1");
                await tick();
                log.push("sync 2");
            }),
            withTransaction(db, async () => {
                log.push("rates");
            }),
        ]);

        expect(log).toStrictEqual(["BEGIN", "sync 1", "sync 2", "COMMIT", "BEGIN", "rates", "COMMIT"]);
    });

    it("lets the next caller through after one fails", async () => {
        const log: string[] = [];
        const db = database(log);

        const failed = withTransaction(db, async () => {
            throw new Error("boom");
        });
        const next = withTransaction(db, async () => {
            log.push("next");
        });

        await expect(failed).rejects.toThrow("boom");
        await next;
        expect(log).toStrictEqual(["BEGIN", "ROLLBACK", "BEGIN", "next", "COMMIT"]);
    });

    it("keeps two databases independent", async () => {
        const first: string[] = [];
        const second: string[] = [];
        let release: () => void = () => undefined;
        const held = new Promise<void>((resolve) => {
            release = () => resolve();
        });

        const blocked = withTransaction(database(first), () => held);
        await withTransaction(database(second), async () => {
            second.push("ran");
        });

        expect(second).toStrictEqual(["BEGIN", "ran", "COMMIT"]);
        release();
        await blocked;
    });
});

class BodyError extends Schema.TaggedError<BodyError>()("BodyError", { message: Schema.String }) {}

class CommitError extends Schema.TaggedError<CommitError>()("CommitError", {
    cause: Schema.Defect(),
    message: Schema.String,
}) {}

const Label = Context.Reference<string>("outlayr/db/transaction.test/Label", { defaultValue: () => "unset" });

const toCommitError = (cause: unknown) => new CommitError({ cause, message: "commit failed" });

describe("transaction", () => {
    it("rolls back and fails with the body's own error, then lets the next caller through", async () => {
        const log: string[] = [];
        const db = database(log);

        const failed = Effect.runPromiseExit(
            transaction(db, Effect.fail(new BodyError({ message: "nope" })), toCommitError)
        );
        const next = withTransaction(db, async () => {
            log.push("next");
        });

        const exit = await failed;
        await next;
        expect(Exit.isFailure(exit) && exit.cause.reasons.map((reason) => reason._tag)).toStrictEqual(["Fail"]);
        expect(Exit.isFailure(exit) && String(exit.cause)).toContain("BodyError");
        expect(log).toStrictEqual(["BEGIN", "ROLLBACK", "BEGIN", "next", "COMMIT"]);
    });

    it("runs behind transactions already queued on the database and sees the caller's services", async () => {
        const log: string[] = [];
        const db = database(log);

        const queued = withTransaction(db, async () => {
            log.push("first");
            await tick();
        });
        const label = await Effect.runPromise(
            transaction(
                db,
                Effect.gen(function* read() {
                    log.push("effect");
                    return yield* Label;
                }),
                toCommitError
            ).pipe(Effect.provideService(Label, "caller"))
        );
        await queued;

        expect(label).toBe("caller");
        expect(log).toStrictEqual(["BEGIN", "first", "COMMIT", "BEGIN", "effect", "COMMIT"]);
    });

    it("maps a failed BEGIN through the caller's error", async () => {
        const db = {
            $client: { withTransactionAsync: () => Promise.reject(new Error("locked")) },
        } as unknown as Database;

        const exit = await Effect.runPromiseExit(transaction(db, Effect.succeed(1), toCommitError));

        expect(Exit.isFailure(exit) && String(exit.cause)).toContain("CommitError");
    });
});
