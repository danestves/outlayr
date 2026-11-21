import type { Language } from "@outlayr/email/language";
import * as Effect from "effect/Effect";

import { DatabaseReader, DatabaseWriter } from "../_generated/services";
import type mailState from "../_generated/tables/mailState";

export type MailState = typeof mailState.Doc.Type;

export const stateOf = Effect.fn("Mail.stateOf")(function* stateOf(userId: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("mailState")
        .get("by_userId", userId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

export const saveState = Effect.fn("Mail.saveState")(function* saveState(
    userId: string,
    state: MailState | null,
    fields: Partial<Omit<MailState, "_creationTime" | "_id" | "userId">>
) {
    const writer = yield* DatabaseWriter;
    if (state) {
        yield* writer.table("mailState").patch(state._id, fields);
        return;
    }
    yield* writer
        .table("mailState")
        .insert({ language: "en", notices: [], proSentAt: null, welcomedAt: null, ...fields, userId });
});

export const recordNotices = Effect.fn("Mail.recordNotices")(function* recordNotices(
    userId: string,
    keys: readonly string[],
    language: Language
) {
    const state = yield* stateOf(userId);
    const added = keys.filter((key) => !state?.notices.includes(key));
    if (added.length > 0) {
        yield* saveState(userId, state, { language, notices: [...(state?.notices ?? []), ...added] });
    }
    return added;
});
