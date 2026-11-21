import { vOnCompleteValidator, Workpool } from "@convex-dev/workpool";
import type { RunResult } from "@convex-dev/workpool";
import { v } from "convex/values";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import { internalMutation } from "../convex/_generated/server";
import type { MutationCtx } from "../convex/_generated/server";
import type { Id } from "./_generated/id";
import { runTransactionEdge } from "./lib/runEdge";

export const pool = new Workpool(components.emailPool, {
    defaultRetryBehavior: { base: 2, initialBackoffMs: 1000, maxAttempts: 4 },
    maxParallelism: 5,
    retryActionsByDefault: true,
});

const decodeFailure = Schema.decodeUnknownOption(Schema.String);

function failureOf(result: RunResult) {
    if (result.kind === "failed") {
        return result.error;
    }
    if (result.kind === "canceled") {
        return "canceled";
    }
    return Option.getOrUndefined(decodeFailure(result.returnValue));
}

const forgetNotices = Effect.fn("EmailOutbox.forgetNotices")(function* forgetNotices(
    ctx: MutationCtx,
    userId: string,
    keys: readonly string[]
) {
    const state = yield* Effect.promise(() =>
        ctx.db
            .query("mailState")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique()
    );
    if (state !== null) {
        const notices = state.notices.filter((key) => !keys.includes(key));
        yield* Effect.promise(() => ctx.db.patch("mailState", state._id, { notices }));
    }
});

const settle = Effect.fn("EmailOutbox.settled")(function* settle(
    ctx: MutationCtx,
    emailId: Id<"outboundEmails">,
    result: RunResult
) {
    const row = yield* Effect.promise(() => ctx.db.get("outboundEmails", emailId));
    if (row === null) {
        return null;
    }
    yield* Effect.promise(() => ctx.db.delete("outboundEmails", emailId));
    const failure = failureOf(result);
    if (failure === undefined) {
        return null;
    }
    yield* Effect.logError("[mail] not sent", failure);
    if (row.notice !== undefined) {
        yield* forgetNotices(ctx, row.notice.userId, row.notice.keys);
    }
    return null;
});

export const settled = internalMutation({
    args: vOnCompleteValidator(v.object({ emailId: v.id("outboundEmails") })),
    handler: (ctx, { context, result }) => runTransactionEdge(settle(ctx, context.emailId, result)),
    returns: v.null(),
});
