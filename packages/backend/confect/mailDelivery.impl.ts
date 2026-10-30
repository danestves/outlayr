import { FunctionImpl, GroupImpl } from "@confect/server";
import { policyChangeEmail } from "@outlayr/email/policy-change";
import { proEmail } from "@outlayr/email/pro";
import { welcomeEmail } from "@outlayr/email/welcome";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationRunner, QueryRunner, Scheduler } from "./_generated/services";
import { noticeKey, POLICY_NOTICES } from "./legal";
import { emailConfig } from "./lib/config";
import { EmailError, sendEmail } from "./lib/email";
import { outboundHttp } from "./lib/http";
import spec from "./mailDelivery.spec";

const NOTICE_CONCURRENCY = 5;

const unsent = (error: EmailError) => Console.error("[mail] not sent", error.message).pipe(Effect.as(null));

const sendWelcome = FunctionImpl.make(
    databaseSchema,
    spec,
    "sendWelcome",
    Effect.fn("Mail.sendWelcome")(function* sendWelcome({ userId }) {
        const { runQuery } = yield* QueryRunner;
        const recipient = yield* runQuery(refs.internal.mail.welcomeRecipient, { userId });
        if (recipient === null) {
            return null;
        }
        const email = yield* Effect.promise(() => welcomeEmail(recipient));
        return yield* sendEmail(recipient.email, email).pipe(
            Effect.provide(outboundHttp),
            Effect.as(null),
            Effect.catchTags({ EmailError: unsent })
        );
    }, Effect.orDie)
);

const sendPro = FunctionImpl.make(
    databaseSchema,
    spec,
    "sendPro",
    Effect.fn("Mail.sendPro")(function* sendPro({ userId, ...entitlement }) {
        const { runQuery } = yield* QueryRunner;
        const to = yield* runQuery(refs.internal.mail.recipient, { userId });
        if (to === null) {
            return null;
        }
        const email = yield* Effect.promise(() => proEmail({ ...entitlement, email: to.email, language: to.language }));
        return yield* sendEmail(to.email, email).pipe(
            Effect.provide(outboundHttp),
            Effect.as(null),
            Effect.catchTags({ EmailError: unsent })
        );
    }, Effect.orDie)
);

const notifyPolicy = FunctionImpl.make(
    databaseSchema,
    spec,
    "notifyPolicy",
    Effect.fn("Mail.notifyPolicy")(function* notifyPolicy({ cursor, document }) {
        const notice = POLICY_NOTICES.toSorted((a, b) => b.effectiveAtMs - a.effectiveAtMs).find(
            (candidate) => candidate.document === document
        );
        if (notice === undefined) {
            return yield* Effect.die(new Error(`There is no ${document} notice in POLICY_NOTICES`));
        }
        if (Option.isNone(yield* emailConfig)) {
            return yield* new EmailError({ reason: "unconfigured" });
        }
        const { runQuery } = yield* QueryRunner;
        const { runMutation } = yield* MutationRunner;
        const key = noticeKey(notice);
        const page = yield* runQuery(refs.internal.mail.noticeRecipients, { cursor: cursor ?? null, key });

        const delivered = yield* Effect.all(
            page.recipients.map(({ email, language, userId }) =>
                Effect.promise(() =>
                    policyChangeEmail({
                        changes: notice.changes[language],
                        document,
                        effectiveAtMs: notice.effectiveAtMs,
                        email,
                        language,
                    })
                ).pipe(
                    Effect.flatMap((message) => sendEmail(email, message)),
                    Effect.andThen(runMutation(refs.internal.mail.recordNotice, { key, language, userId })),
                    Effect.as(true),
                    Effect.catchTags({ EmailError: (error) => unsent(error).pipe(Effect.as(false)) })
                )
            ),
            { concurrency: NOTICE_CONCURRENCY }
        ).pipe(Effect.provide(outboundHttp));

        if (!page.isDone) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(Duration.zero, refs.internal.mailDelivery.notifyPolicy, {
                cursor: page.continueCursor,
                document,
            });
        }
        const sent = delivered.filter(Boolean).length;
        return { failed: delivered.length - sent, sent };
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(sendWelcome),
    Layer.provide(sendPro),
    Layer.provide(notifyPolicy),
    GroupImpl.finalize
);
