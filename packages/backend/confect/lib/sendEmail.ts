import { createEmailClient, EmailAdapterError, EmailRouteError } from "@opencoredev/email-sdk";
import { cloudflare } from "@opencoredev/email-sdk/cloudflare";
import { resend } from "@opencoredev/email-sdk/resend";
import { smtp } from "@opencoredev/email-sdk/smtp";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { EmailError } from "./email";
import type { Email } from "./email";
import { emailSetup } from "./emailSetup";
import type { SendingSetup } from "./emailSetup";

const SEND_TIMEOUT = Duration.seconds(10);
const SMTP_IMPLICIT_TLS_PORT = 465;
const SENDER_NAME = "Outlayr";

function refusedStatus(cause: unknown) {
    const failures: readonly unknown[] = cause instanceof EmailRouteError ? cause.failures : [cause];
    const refused = failures.find(
        (failure): failure is EmailAdapterError => failure instanceof EmailAdapterError && failure.status !== undefined
    );
    return refused?.status;
}

function adapterFor(setup: SendingSetup) {
    if (setup.provider === "cloudflare") {
        return cloudflare({ accountId: setup.accountId, apiToken: Redacted.value(setup.token) });
    }
    if (setup.provider === "resend") {
        return resend({ apiKey: Redacted.value(setup.apiKey) });
    }
    return smtp({
        auth: setup.auth.pipe(
            Option.map(({ password, username }) => ({ pass: Redacted.value(password), user: username })),
            Option.getOrUndefined
        ),
        host: setup.host,
        port: setup.port,
        secure: setup.port === SMTP_IMPLICIT_TLS_PORT,
    });
}

export const sendEmail = Effect.fn("Email.send")(function* sendEmail(
    to: string,
    { html, replyTo, subject, text }: Email
) {
    const setup = yield* emailSetup;
    if (setup.provider === "log") {
        yield* Console.log(`[mail] to ${to}: ${subject}\n\n${text}`);
        return;
    }
    if (setup.provider === "unconfigured") {
        return yield* new EmailError({ provider: setup.requested, reason: "unconfigured" });
    }
    const { provider } = setup;
    const client = createEmailClient({ adapters: [adapterFor(setup)], telemetry: false });
    const result = yield* Effect.tryPromise({
        catch: (cause) => {
            const status = refusedStatus(cause);
            return status === undefined
                ? new EmailError({ cause, provider, reason: "transport" })
                : new EmailError({ cause, provider, reason: "status", status });
        },
        try: (signal) =>
            client.send(
                {
                    from: { email: setup.from, name: SENDER_NAME },
                    html,
                    replyTo,
                    subject,
                    text,
                    to,
                },
                { signal }
            ),
    }).pipe(
        Effect.timeout(SEND_TIMEOUT),
        Effect.catchTags({
            TimeoutError: (cause) => Effect.fail(new EmailError({ cause, provider, reason: "transport" })),
        })
    );
    if (result.rejected !== undefined && result.rejected.length > 0) {
        return yield* new EmailError({ provider, reason: "rejected" });
    }
});
