import { createEmailClient, EmailAdapterError, EmailRouteError, EmailSdkError } from "@opencoredev/email-sdk";
import { cloudflare } from "@opencoredev/email-sdk/cloudflare";
import { resend } from "@opencoredev/email-sdk/resend";
import { smtp } from "@opencoredev/email-sdk/smtp";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { EmailError } from "./email";
import type { Email } from "./email";
import type { SendingSetup } from "./emailSetup";

const SEND_TIMEOUT = Duration.seconds(10);
const SMTP_SOCKET_TIMEOUT = Duration.seconds(5);
const SMTP_IMPLICIT_TLS_PORT = 465;
const SENDER_NAME = "Outlayr";

function failuresOf(cause: unknown): readonly unknown[] {
    return cause instanceof EmailRouteError ? cause.failures : [cause];
}

function retryable(cause: unknown) {
    return failuresOf(cause).some((failure) => !(failure instanceof EmailSdkError) || failure.retryable);
}

function refusedStatus(cause: unknown) {
    const refused = failuresOf(cause).find(
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
        timeoutMs: Duration.toMillis(SMTP_SOCKET_TIMEOUT),
    });
}

export const deliverEmail = Effect.fn("Email.deliver")(function* deliverEmail(
    setup: SendingSetup,
    to: string,
    { html, replyTo, subject, text }: Email
) {
    const { provider } = setup;
    const client = createEmailClient({ adapters: [adapterFor(setup)], telemetry: false });
    const result = yield* Effect.tryPromise({
        catch: (cause) => {
            const status = refusedStatus(cause);
            return status === undefined
                ? new EmailError({ cause, provider, reason: "transport", retryable: retryable(cause) })
                : new EmailError({ cause, provider, reason: "status", retryable: retryable(cause), status });
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
