import { describe, expect, it } from "@jest/globals";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";

import { commitSavedEntry } from "./entry-save";
import type { SavedEntryPlan } from "./entry-save";

const boom = Effect.fail(new Error("boom"));

function planOf(overrides: Partial<SavedEntryPlan>, ran: string[]): SavedEntryPlan {
    const step = (name: string) => Effect.sync(() => ran.push(name));
    return {
        backfill: null,
        carry: null,
        queueLookup: null,
        rememberAccount: null,
        syncReminders: step("sync"),
        ...overrides,
    };
}

describe("commitSavedEntry", () => {
    it("still syncs reminders and reports the schedule failure when the backfill fails", async () => {
        const ran: string[] = [];
        const synced = await Effect.runPromise(
            Effect.gen(function* run() {
                const done = yield* Deferred.make<undefined>();
                const result = yield* commitSavedEntry(
                    planOf(
                        {
                            backfill: boom,
                            syncReminders: Effect.sync(() => ran.push("sync")).pipe(
                                Effect.andThen(Deferred.succeed(done, undefined))
                            ),
                        },
                        ran
                    )
                );
                yield* Deferred.await(done);
                return result;
            })
        );
        expect(synced).toStrictEqual({ scheduleFailed: true });
        expect(ran).toStrictEqual(["sync"]);
    });

    it("keeps the save committed when the account memory, lookup queue and carry all fail", async () => {
        const ran: string[] = [];
        const result = await Effect.runPromise(
            commitSavedEntry(
                planOf({ backfill: Effect.void, carry: boom, queueLookup: boom, rememberAccount: boom }, ran)
            )
        );
        expect(result).toStrictEqual({ scheduleFailed: false });
    });

    it("remembers the account before the backfill runs", async () => {
        const ran: string[] = [];
        await Effect.runPromise(
            commitSavedEntry(
                planOf(
                    {
                        backfill: Effect.sync(() => ran.push("backfill")),
                        rememberAccount: Effect.sync(() => ran.push("remember")),
                    },
                    ran
                )
            )
        );
        expect(ran.slice(0, 2)).toStrictEqual(["remember", "backfill"]);
    });
});
