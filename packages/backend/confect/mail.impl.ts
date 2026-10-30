import { FunctionImpl, GroupImpl } from "@confect/server";
import type { Language } from "@outlayr/email/language";
import { PRO_ENTITLEMENT_ID } from "@outlayr/money/contract";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, QueryCtx, Scheduler } from "./_generated/services";
import type mailState from "./_generated/tables/mailState";
import { authComponent } from "./lib/betterAuth";
import spec from "./mail.spec";

const NOTICE_PAGE = 50;
const ANONYMOUS_PREFIX = "$RCAnonymousID:";

type MailState = typeof mailState.Doc.Type;

const AuthUser = Schema.Struct({ _id: Schema.String, email: Schema.String, emailVerified: Schema.Boolean });
const decodeAuthUser = Schema.decodeUnknownOption(AuthUser);
const decodeProviders = Schema.decodeUnknownOption(Schema.Array(Schema.Struct({ providerId: Schema.String })));

const stateOf = Effect.fn("Mail.stateOf")(function* stateOf(userId: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("mailState")
        .get("by_userId", userId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const saveState = Effect.fn("Mail.saveState")(function* saveState(
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

const verifiedUser = Effect.fn("Mail.verifiedUser")(function* verifiedUser(userId: string) {
    const ctx = yield* QueryCtx;
    const user = yield* Effect.promise(() => authComponent.getAnyUserById(ctx, userId));
    return decodeAuthUser(user).pipe(Option.filter(({ emailVerified }) => emailVerified));
});

const claimWelcome = FunctionImpl.make(
    databaseSchema,
    spec,
    "claimWelcome",
    Effect.fn("Mail.claimWelcome")(function* claimWelcome({ language, userId }) {
        const state = yield* stateOf(userId);
        if (state?.welcomedAt != null) {
            return null;
        }
        yield* saveState(userId, state, { language, welcomedAt: yield* Clock.currentTimeMillis });
        const scheduler = yield* Scheduler;
        yield* scheduler.runAfter(Duration.zero, refs.internal.mailDelivery.sendWelcome, { userId });
        return null;
    }, Effect.orDie)
);

const rememberLanguage = FunctionImpl.make(
    databaseSchema,
    spec,
    "rememberLanguage",
    Effect.fn("Mail.rememberLanguage")(function* rememberLanguage({ language, userId }) {
        const state = yield* stateOf(userId);
        if (state?.language !== language) {
            yield* saveState(userId, state, { language });
        }
        return null;
    }, Effect.orDie)
);

const welcomeRecipient = FunctionImpl.make(
    databaseSchema,
    spec,
    "welcomeRecipient",
    Effect.fn("Mail.welcomeRecipient")(function* welcomeRecipient({ userId }) {
        const user = yield* verifiedUser(userId);
        if (Option.isNone(user)) {
            return null;
        }
        const ctx = yield* QueryCtx;
        const accounts = yield* Effect.promise(() =>
            ctx.runQuery(components.betterAuth.adapter.findMany, {
                model: "account",
                paginationOpts: { cursor: null, numItems: 10 },
                where: [{ field: "userId", operator: "eq", value: userId }],
            })
        );
        const providers = Option.getOrElse(decodeProviders(accounts.page), () => []).map(
            ({ providerId }) => providerId
        );
        const provider: "apple" | "email" | "google" =
            providers.find((id) => id === "apple" || id === "google") ?? "email";
        const state = yield* stateOf(userId);
        return { email: user.value.email, language: state?.language ?? "en", provider };
    }, Effect.orDie)
);

const claimPro = FunctionImpl.make(
    databaseSchema,
    spec,
    "claimPro",
    Effect.fn("Mail.claimPro")(function* claimPro(args) {
        const userId = args.appUserId;
        if (args.isSandbox || args.entitlementId !== PRO_ENTITLEMENT_ID || userId.startsWith(ANONYMOUS_PREFIX)) {
            return null;
        }
        const state = yield* stateOf(userId);
        if (state?.proSentAt != null) {
            return null;
        }
        yield* saveState(userId, state, { proSentAt: yield* Clock.currentTimeMillis });
        const scheduler = yield* Scheduler;
        yield* scheduler.runAfter(Duration.zero, refs.internal.mailDelivery.sendPro, {
            expiresAtMs: args.expiresAtMs,
            familyShared: args.ownershipType === "FAMILY_SHARED",
            productId: args.productId,
            store: args.store,
            userId,
        });
        return null;
    }, Effect.orDie)
);

const recipient = FunctionImpl.make(
    databaseSchema,
    spec,
    "recipient",
    Effect.fn("Mail.recipient")(function* recipient({ userId }) {
        const user = yield* verifiedUser(userId);
        if (Option.isNone(user)) {
            return null;
        }
        const state = yield* stateOf(userId);
        return { email: user.value.email, language: state?.language ?? "en", userId };
    }, Effect.orDie)
);

const noticeRecipients = FunctionImpl.make(
    databaseSchema,
    spec,
    "noticeRecipients",
    Effect.fn("Mail.noticeRecipients")(function* noticeRecipients({ cursor, key }) {
        const ctx = yield* QueryCtx;
        const users = yield* Effect.promise(() =>
            ctx.runQuery(components.betterAuth.adapter.findMany, {
                model: "user",
                paginationOpts: { cursor, numItems: NOTICE_PAGE },
            })
        );
        const recipients: { email: string; language: Language; userId: string }[] = [];
        for (const user of users.page.map(decodeAuthUser).filter(Option.isSome)) {
            const { _id: userId, email, emailVerified } = user.value;
            const state = yield* stateOf(userId);
            if (emailVerified && !state?.notices.includes(key)) {
                recipients.push({ email, language: state?.language ?? "en", userId });
            }
        }
        return { continueCursor: users.continueCursor, isDone: users.isDone, recipients };
    }, Effect.orDie)
);

const recordNotice = FunctionImpl.make(
    databaseSchema,
    spec,
    "recordNotice",
    Effect.fn("Mail.recordNotice")(function* recordNotice({ key, language, userId }) {
        const state = yield* stateOf(userId);
        if (!state?.notices.includes(key)) {
            yield* saveState(userId, state, { language, notices: [...(state?.notices ?? []), key] });
        }
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(claimWelcome),
    Layer.provide(rememberLanguage),
    Layer.provide(welcomeRecipient),
    Layer.provide(claimPro),
    Layer.provide(recipient),
    Layer.provide(noticeRecipients),
    Layer.provide(recordNotice),
    GroupImpl.finalize
);
