import { FunctionImpl, GroupImpl } from "@confect/server";
import type { WorkId } from "@convex-dev/workpool";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { internal } from "../convex/_generated/api";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx } from "./_generated/services";
import { pool, settled } from "./emailOutbox";
import spec from "./emailOutbox.spec";
import { recordNotices } from "./lib/mailState";

const enqueue = FunctionImpl.make(
    databaseSchema,
    spec,
    "enqueue",
    Effect.fn("EmailOutbox.enqueue")(function* enqueue(email) {
        const emailId = yield* (yield* DatabaseWriter).table("outboundEmails").insert(email);
        if (email.notice !== undefined) {
            yield* recordNotices(email.notice.userId, email.notice.keys, email.notice.language);
        }
        const ctx = yield* MutationCtx;
        yield* Effect.promise((): Promise<WorkId> =>
            pool.enqueueAction(
                ctx,
                internal.mailDelivery.deliver,
                { emailId },
                { context: { emailId }, onComplete: internal.emailOutbox.settled }
            )
        );
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
