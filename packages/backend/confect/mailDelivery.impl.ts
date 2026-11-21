import { FunctionImpl, GroupImpl } from "@confect/server";
import { policyChangeEmail } from "@outlayr/email/policy-change";
import { proEmail } from "@outlayr/email/pro";
import { trialEndingEmail } from "@outlayr/email/trial-ending";
import { welcomeEmail } from "@outlayr/email/welcome";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationRunner, QueryRunner, Scheduler } from "./_generated/services";
import { noticeKey, POLICY_NOTICES } from "./legal";
import { siteUrl } from "./lib/config";
import { EmailError } from "./lib/email";
import { emailSetup } from "./lib/emailSetup";
import { outboundHttp } from "./lib/http";
import { sendEmail } from "./lib/sendEmail";
import spec from "./mailDelivery.spec";
import { decodeProSubscriber, proTermOf } from "./proTerm";
import { storeSubscriber } from "./revenuecat";
import { catalogPrice } from "./stripe";

const NOTICE_CONCURRENCY = 5;
const POLICY_REPLY_TO = "support@tryoutlayr.com";

const unsent = (error: EmailError) => Console.error("[mail] not sent", error.message).pipe(Effect.as(null));

const send = FunctionImpl.make(
    databaseSchema,
    spec,
    "send",
    Effect.fn("Mail.send")(function* send({ to, ...email }) {
        return yield* sendEmail(to, email).pipe(Effect.as(null), Effect.catchTags({ EmailError: unsent }));
    }, Effect.orDie)
);

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
        return yield* sendEmail(recipient.email, email).pipe(Effect.as(null), Effect.catchTags({ EmailError: unsent }));
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
        return yield* sendEmail(to.email, email).pipe(Effect.as(null), Effect.catchTags({ EmailError: unsent }));
    }, Effect.orDie)
);

const sendTrialReminder = FunctionImpl.make(
    databaseSchema,
    spec,
    "sendTrialReminder",
    Effect.fn("Mail.sendTrialReminder")(
        function* sendTrialReminder({ userId }) {
            const { runQuery } = yield* QueryRunner;
            const to = yield* runQuery(refs.internal.mail.recipient, { userId });
            if (to === null) {
                return null;
            }
            const subscriber = yield* storeSubscriber(userId);
            const decoded = subscriber === null ? Option.none() : decodeProSubscriber(subscriber);
            if (Option.isNone(decoded)) {
                return null;
            }
            const term = proTermOf(decoded.value, yield* Clock.currentTimeMillis);
            const chargeAtMs = term.expiresAtMs;
            if (term.state !== "trial" || term.store !== "stripe" || chargeAtMs === null) {
                return null;
            }
            const manageUrl = `${yield* siteUrl}/settings/plan`;
            const catalog =
                term.productId === null
                    ? null
                    : yield* catalogPrice(term.productId).pipe(
                          Effect.catchTags({ StripeError: () => Effect.succeed(null) })
                      );
            const email = yield* Effect.promise(() =>
                trialEndingEmail({
                    chargeAtMs,
                    email: to.email,
                    language: to.language,
                    manageUrl,
                    price: catalog?.price ?? term.price,
                })
            );
            return yield* sendEmail(to.email, email).pipe(Effect.as(null), Effect.catchTags({ EmailError: unsent }));
        },
        Effect.provide(outboundHttp),
        Effect.orDie
    )
);

const notifyPolicy = FunctionImpl.make(
    databaseSchema,
    spec,
    "notifyPolicy",
    Effect.fn("Mail.notifyPolicy")(function* notifyPolicy({ cursor }) {
        const latestMs = Math.max(...POLICY_NOTICES.map((notice) => notice.effectiveAtMs));
        const batch = POLICY_NOTICES.filter((notice) => notice.effectiveAtMs === latestMs);
        const setup = yield* emailSetup;
        if (setup.provider === "log" || setup.provider === "unconfigured") {
            const provider = setup.provider === "log" ? setup.provider : setup.requested;
            return yield* new EmailError({ provider, reason: "unconfigured" });
        }
        const { runQuery } = yield* QueryRunner;
        const { runMutation } = yield* MutationRunner;
        const page = yield* runQuery(refs.internal.mail.noticeRecipients, {
            cursor: cursor ?? null,
            keys: batch.map(noticeKey),
        });

        const delivered = yield* Effect.all(
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
                    Effect.flatMap((message) => sendEmail(email, { ...message, replyTo: POLICY_REPLY_TO })),
                    Effect.as(Option.some({ keys: pending, language, userId })),
                    Effect.catchTags({ EmailError: (error) => unsent(error).pipe(Effect.as(Option.none())) })
                )
            ),
            { concurrency: NOTICE_CONCURRENCY }
        );
        const deliveries = delivered.filter(Option.isSome).map(({ value }) => value);
        if (deliveries.length > 0) {
            yield* runMutation(refs.internal.mail.recordNotice, { deliveries });
        }

        if (!page.isDone) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(Duration.zero, refs.internal.mailDelivery.notifyPolicy, {
                cursor: page.continueCursor,
            });
        }
        return { failed: delivered.length - deliveries.length, sent: deliveries.length };
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(send),
    Layer.provide(sendWelcome),
    Layer.provide(sendPro),
    Layer.provide(sendTrialReminder),
    Layer.provide(notifyPolicy),
    GroupImpl.finalize
);
