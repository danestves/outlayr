import * as Effect from "effect/Effect";

import { DatabaseReader, DatabaseWriter } from "../_generated/services";
import { AccountDeleting } from "../sync";

// The session and Pro outlive `purgeUserBatch` by up to a retried RevenueCat call, and a push in that window writes
// rows for a user id no purge path can find again. `prepared` is allowed: the owner may yet cancel.
export const refuseWhileDeleting = Effect.fn("Sync.refuseWhileDeleting")(function* refuseWhileDeleting(userId: string) {
    const reader = yield* DatabaseReader;
    // Every job, not a page: a page could bury the refusing job. `accountDeletion.prepare` caps the set per user.
    const jobs = yield* reader
        .table("accountDeletionJobs")
        .index("by_userId", (q) => q.eq("userId", userId))
        .collect();
    if (jobs.some((job) => job.phase !== "prepared")) {
        return yield* new AccountDeleting();
    }
});

export const seqCounter = Effect.fn("Sync.seqCounter")(function* seqCounter(userId: string) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const state = yield* reader
        .table("syncState")
        .get("by_user", userId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    // Starts at 1 so a cursor of 0 means "nothing read yet".
    const nextSeq = state?.nextSeq ?? 1;
    return {
        advanceTo: Effect.fn("Sync.advanceTo")(function* advanceTo(next: number) {
            if (next <= nextSeq) {
                return;
            }
            yield* state
                ? writer.table("syncState").patch(state._id, { nextSeq: next })
                : writer.table("syncState").insert({ nextSeq: next, userId });
        }),
        nextSeq,
    };
});
