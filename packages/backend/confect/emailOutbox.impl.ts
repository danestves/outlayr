import { FunctionImpl, GroupImpl } from "@confect/server";
import type { WorkId, Workpool } from "@convex-dev/workpool";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { internal } from "../convex/_generated/api";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx } from "./_generated/services";
import { noticePool, pool, settled } from "./emailOutbox";
import spec from "./emailOutbox.spec";
import { recordNotices } from "./lib/mailState";
import type { OutboundEmail } from "./tables/outboundEmails";

const queue = Effect.fn("EmailOutbox.queue")(function* queue(row: typeof OutboundEmail.Type, workpool: Workpool) {
    const emailId = yield* (yield* DatabaseWriter).table("outboundEmails").insert(row);
    const ctx = yield* MutationCtx;
    yield* Effect.promise((): Promise<WorkId> =>
        workpool.enqueueAction(
            ctx,
            internal.mailDelivery.deliver,
            { emailId },
            { context: { emailId }, onComplete: internal.emailOutbox.settled }
        )
    );
});

const enqueue = FunctionImpl.make(
    databaseSchema,
    spec,
    "enqueue",
    Effect.fn("EmailOutbox.enqueue")(function* enqueue({ notice, ...email }) {
        if (notice === undefined) {
            yield* queue(email, pool);
            return null;
        }
        const keys = yield* recordNotices(notice.userId, notice.keys, notice.language);
        if (keys.length > 0) {
            yield* queue({ ...email, notice: { ...notice, keys } }, noticePool);
        }
        return null;
    }, Effect.orDie)
);

const email = FunctionImpl.make(
    databaseSchema,
    spec,
    "email",
    Effect.fn("EmailOutbox.email")(function* email({ emailId }) {
        return yield* (yield* DatabaseReader)
            .table("outboundEmails")
            .get(emailId)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(enqueue),
    Layer.provide(email),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "settled", settled)),
    GroupImpl.finalize
);
