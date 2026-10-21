import { describe, expect, it } from "@jest/globals";

import type { Database } from "./client";
import { withTransaction } from "./transaction";

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
