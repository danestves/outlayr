import { FunctionImpl, GroupImpl } from "@confect/server";
import type { WorkId, Workpool } from "@convex-dev/workpool";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { internal } from "../convex/_generated/api";
import type { Id } from "./_generated/id";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx } from "./_generated/services";
import { noticePool, pool, settled } from "./emailOutbox";
import spec from "./emailOutbox.spec";
import { recordNotices } from "./lib/mailState";
import type { OutboundEmail } from "./tables/outboundEmails";

const queue = Effect.fn("EmailOutbox.queue")(function* queue(row: typeof OutboundEmail.Type, workpool: Workpool) {
    const writer = yield* DatabaseWriter;
    const emailId = yield* writer.table("outboundEmails").insert(row);
    const ctx = yield* MutationCtx;
    const { expiresAt } = row;
    if (expiresAt !== undefined) {
        const expiry = yield* Effect.promise((): Promise<Id<"_scheduled_functions">> =>
            ctx.scheduler.runAt(expiresAt, internal.emailOutbox.expire, { emailId })
        );
        yield* writer.table("outboundEmails").patch(emailId, { expiry });
    }
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
            return true;
        }
        const keys = yield* recordNotices(notice.userId, notice.keys, notice.language);
        if (keys.length === 0) {
            return false;
        }
        yield* queue({ ...email, notice: { ...notice, keys } }, noticePool);
        return true;
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

const expire = FunctionImpl.make(
    databaseSchema,
    spec,
    "expire",
    Effect.fn("EmailOutbox.expire")(function* expire({ emailId }) {
        const row = yield* (yield* DatabaseReader)
            .table("outboundEmails")
            .get(emailId)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row !== null) {
            yield* (yield* DatabaseWriter).table("outboundEmails").delete(emailId);
            yield* Effect.logError("[mail] not sent", "expired");
        }
        return null;
    }, Effect.orDie)
);

const noticesSending = FunctionImpl.make(
    databaseSchema,
    spec,
    "noticesSending",
    Effect.fn("EmailOutbox.noticesSending")(function* noticesSending() {
        const sending = yield* (yield* DatabaseReader)
            .table("outboundEmails")
            .index("by_notice", (q) => q.gte("notice.userId", ""))
            .first();
        return Option.isSome(sending);
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(enqueue),
    Layer.provide(email),
    Layer.provide(expire),
    Layer.provide(noticesSending),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "settled", settled)),
    GroupImpl.finalize
);
