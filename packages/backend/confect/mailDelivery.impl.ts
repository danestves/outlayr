import { FunctionImpl, GroupImpl } from "@confect/server";
import * as ConvexConfigProvider from "@confect/server/ConvexConfigProvider";
import { policyChangeEmail } from "@outlayr/email/policy-change";
import { proEmail } from "@outlayr/email/pro";
import { welcomeEmail } from "@outlayr/email/welcome";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { QueryRunner, Scheduler } from "./_generated/services";
import { noticeKey, POLICY_NOTICES } from "./legal";
import { deliverEmail } from "./lib/deliverEmail";
import { EmailError, NoticesStillSending } from "./lib/email";
import { emailSetup } from "./lib/emailSetup";
import { sendEmail } from "./lib/sendEmail";
import spec from "./mailDelivery.spec";

const NOTICE_CONCURRENCY = 5;
const POLICY_REPLY_TO = "support@tryoutlayr.com";

const unsent = (error: EmailError) => Console.error("[mail] not sent", error.message).pipe(Effect.as(null));

const sendWelcome = FunctionImpl.make(
    databaseSchema,
    spec,
    "sendWelcome",
    Effect.fn("Mail.sendWelcome")(
        function* sendWelcome({ userId }) {
            const { runQuery } = yield* QueryRunner;
            const recipient = yield* runQuery(refs.internal.mail.welcomeRecipient, { userId });
            if (recipient === null) {
                return null;
            }
            const email = yield* Effect.promise(() => welcomeEmail(recipient));
            return yield* sendEmail(recipient.email, email).pipe(
                Effect.as(null),
                Effect.catchTags({ EmailError: unsent })
            );
        },
        Effect.provide(ConvexConfigProvider.layer),
        Effect.orDie
    )
);

const sendPro = FunctionImpl.make(
    databaseSchema,
    spec,
    "sendPro",
    Effect.fn("Mail.sendPro")(
        function* sendPro({ userId, ...entitlement }) {
            const { runQuery } = yield* QueryRunner;
            const to = yield* runQuery(refs.internal.mail.recipient, { userId });
            if (to === null) {
                return null;
            }
            const email = yield* Effect.promise(() =>
                proEmail({ ...entitlement, email: to.email, language: to.language })
            );
            return yield* sendEmail(to.email, email).pipe(Effect.as(null), Effect.catchTags({ EmailError: unsent }));
        },
        Effect.provide(ConvexConfigProvider.layer),
        Effect.orDie
    )
);

const notifyPolicy = FunctionImpl.make(
    databaseSchema,
    spec,
    "notifyPolicy",
    Effect.fn("Mail.notifyPolicy")(
        function* notifyPolicy({ cursor }) {
            const latestMs = Math.max(...POLICY_NOTICES.map((notice) => notice.effectiveAtMs));
            const batch = POLICY_NOTICES.filter((notice) => notice.effectiveAtMs === latestMs);
            const setup = yield* emailSetup;
            if (setup.provider === "log" || setup.provider === "unconfigured") {
                const provider = setup.provider === "log" ? setup.provider : setup.requested;
                return yield* new EmailError({ provider, reason: "unconfigured" });
            }
            const { runQuery } = yield* QueryRunner;
            if (cursor === undefined && (yield* runQuery(refs.internal.emailOutbox.noticesSending, {}))) {
                return yield* new NoticesStillSending({
                    message:
                        "Policy emails from an earlier run are still sending; run notifyPolicy again once they finish",
                });
            }
            const page = yield* runQuery(refs.internal.mail.noticeRecipients, {
                cursor: cursor ?? null,
                keys: batch.map(noticeKey),
            });

            const outcomes = yield* Effect.all(
                page.recipients.map(({ email, language, pending, userId }) =>
                    Effect.promise(() =>
                        policyChangeEmail({
                            documents: batch
                                .filter((notice) => pending.includes(noticeKey(notice)))
                                .map(({ changes, document }) => ({ changes: changes[language], document })),
                            effectiveAtMs: latestMs,
                            email,
                            language,
                        })
                    ).pipe(
                        Effect.flatMap((message) =>
                            sendEmail(
                                email,
                                { ...message, replyTo: POLICY_REPLY_TO },
                                { keys: pending, language, userId }
                            )
                        ),
                        Effect.map((queued) => (queued ? "sent" : "skipped")),
                        Effect.catchTags({ EmailError: (error) => unsent(error).pipe(Effect.as("failed" as const)) })
                    )
                ),
                { concurrency: NOTICE_CONCURRENCY }
            );
            if (!page.isDone) {
                const scheduler = yield* Scheduler;
                yield* scheduler.runAfter(Duration.zero, refs.internal.mailDelivery.notifyPolicy, {
                    cursor: page.continueCursor,
                });
            }
            return {
                failed: outcomes.filter((outcome) => outcome === "failed").length,
                sent: outcomes.filter((outcome) => outcome === "sent").length,
            };
        },
        Effect.provide(ConvexConfigProvider.layer),
        Effect.orDie
    )
);

const deliver = FunctionImpl.make(
    databaseSchema,
    spec,
    "deliver",
    Effect.fn("Mail.deliver")(
        function* deliver({ emailId }) {
            const { runQuery } = yield* QueryRunner;
            const email = yield* runQuery(refs.internal.emailOutbox.email, { emailId });
            const now = yield* Clock.currentTimeMillis;
            if (email === null || (email.expiresAt !== undefined && now >= email.expiresAt)) {
                return null;
            }
            const setup = yield* emailSetup;
            if (setup.provider === "log") {
                return new EmailError({ provider: "log", reason: "unconfigured" }).message;
            }
            if (setup.provider === "unconfigured") {
                return new EmailError({ provider: setup.requested, reason: "unconfigured" }).message;
            }
            return yield* deliverEmail(setup, email.to, email, emailId).pipe(
                Effect.as(null),
                Effect.catchTags({
                    EmailError: (error) => (error.permanent ? Effect.succeed(error.message) : Effect.fail(error)),
                })
            );
        },
        Effect.provide(ConvexConfigProvider.layer),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(sendWelcome),
    Layer.provide(sendPro),
    Layer.provide(notifyPolicy),
    Layer.provide(deliver),
    GroupImpl.finalize
);
