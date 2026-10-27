import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { authClient } from "@/lib/auth-client";
import { persistProviderBinding } from "@/lib/provider-revocation";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

type AuthClient = NonNullable<typeof authClient>;

interface EmailRequest {
    client: AuthClient;
    email: string;
    fetchOptions: { headers: Record<string, string> };
}

interface AuthResult<T> {
    data: T | null;
    error: { message?: string } | null;
}

export class EmailAuthError extends Schema.TaggedError<EmailAuthError>()("EmailAuthError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "Email sign-in failed";
    }
}

const call = <T>(run: () => Promise<T>) =>
    Effect.tryPromise({ catch: (cause) => new EmailAuthError({ cause }), try: run });

const unwrap = <T>({ data, error }: AuthResult<T>) =>
    error !== null || data === null
        ? Effect.fail(
              new EmailAuthError({ cause: Object.assign(new Error(error?.message ?? "Email sign-in failed"), error) })
          )
        : Effect.succeed(data);

const request = <T>(run: () => Promise<AuthResult<T>>) => call(run).pipe(Effect.flatMap(unwrap));

const bindPassword = (user: { email: string; id: string }) =>
    persistProviderBinding({ betterAuthUserId: user.id, provider: "password", providerSubject: user.email });

export const signInEmailCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("AuthFlow.signInEmail")(function* signInEmail(input: EmailRequest & { password: string }) {
        const { client, fetchOptions, password } = input;
        const result = yield* call(() => client.signIn.email({ email: input.email.trim(), fetchOptions, password }));
        // Better Auth has just sent a fresh code for exactly this case.
        if (result.error?.code === "EMAIL_NOT_VERIFIED") {
            return "verify" as const;
        }
        const { user } = yield* unwrap(result);
        yield* bindPassword(user);
        return "signed-in" as const;
    }),
    label: "auth-flow:sign-in-email",
});

export const signUpEmailCommand = createRuntimeCommand(appRuntime, {
    execute: (input: EmailRequest & { password: string }) =>
        request(() =>
            input.client.signUp.email({
                email: input.email.trim(),
                fetchOptions: input.fetchOptions,
                name: "",
                password: input.password,
            })
        ),
    label: "auth-flow:sign-up-email",
});

export const verifyEmailCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("AuthFlow.verifyEmail")(function* verifyEmail(input: EmailRequest & { otp: string }) {
        const { client, email, fetchOptions, otp } = input;
        const { user } = yield* request(() => client.emailOtp.verifyEmail({ email, fetchOptions, otp }));
        yield* bindPassword(user);
    }),
    label: "auth-flow:verify-email",
});

export const sendVerificationOtpCommand = createRuntimeCommand(appRuntime, {
    execute: (input: EmailRequest) =>
        request(() =>
            input.client.emailOtp.sendVerificationOtp({
                email: input.email,
                fetchOptions: input.fetchOptions,
                type: "email-verification",
            })
        ),
    label: "auth-flow:send-verification-otp",
});

export const requestPasswordResetCommand = createRuntimeCommand(appRuntime, {
    execute: (input: EmailRequest) =>
        request(() =>
            input.client.emailOtp.requestPasswordReset({ email: input.email, fetchOptions: input.fetchOptions })
        ),
    label: "auth-flow:request-password-reset",
});

export const resetPasswordCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("AuthFlow.resetPassword")(function* resetPassword(
        input: EmailRequest & { otp: string; password: string }
    ) {
        const { client, email, fetchOptions, otp, password } = input;
        yield* request(() => client.emailOtp.resetPassword({ email, fetchOptions, otp, password }));
        const { user } = yield* request(() => client.signIn.email({ email, fetchOptions, password }));
        yield* bindPassword(user);
    }),
    label: "auth-flow:reset-password",
});
