import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { useState } from "react";
import type { FormEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { AuthFailure, authRequest, failureKey } from "@/lib/account";
import type { FailureKey } from "@/lib/account";
import { authClient } from "@/lib/auth-client";

import { SiteLink } from "../site-link";
import { CODE_LENGTH, CodeField, ErrorLine, Field, LINE_PILL, Muted, Screen, SOLID_PILL, TEXT_BUTTON } from "./parts";
import { AppleGlyph, GoogleGlyph } from "./provider-icons";

const MIN_PASSWORD_LENGTH = 8;
const SHOW_AFTER_MS = 400;
const SHOW_AT_LEAST_MS = 300;

type Step = "create" | "reset" | "sign-in" | "verify";

export function SignInFlow({ onDone, target }: { onDone: () => void; target: string }) {
    const copy = useIntlayer("sign-in");
    const [step, setStep] = useState<Step>("sign-in");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<FailureKey | null>(null);
    const [resent, setResent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);

    const go = (next: Step) => {
        setError(null);
        setResent(false);
        setCode("");
        setPassword("");
        setStep(next);
    };

    const run = (program: Effect.Effect<void, AuthFailure>) => {
        setError(null);
        setBusy(true);
        Effect.runFork(
            program.pipe(
                Effect.catchTags({ AuthFailure: (failure) => Effect.sync(() => setError(failureKey(failure))) }),
                Effect.ensuring(Effect.sync(() => setBusy(false)))
            )
        );
    };

    const social = (provider: "apple" | "google") =>
        run(authRequest(() => authClient.signIn.social({ callbackURL: target, provider })));

    const signIn = (event: FormEvent) => {
        event.preventDefault();
        run(
            Effect.gen(function* signInProgram() {
                yield* authRequest(() => authClient.signIn.email({ email, password }));
                onDone();
            }).pipe(
                Effect.catchIf(
                    (failure) => failure.code === "EMAIL_NOT_VERIFIED",
                    () => Effect.sync(() => go("verify"))
                )
            )
        );
    };

    const create = (event: FormEvent) => {
        event.preventDefault();
        run(
            Effect.gen(function* createProgram() {
                yield* authRequest(() => authClient.signUp.email({ email, name: "", password }));
                go("verify");
            })
        );
    };

    const verify = (otp: string) =>
        run(
            Effect.gen(function* verifyProgram() {
                yield* authRequest(() => authClient.emailOtp.verifyEmail({ email, otp }));
                onDone();
            })
        );

    const resendVerification = () =>
        run(
            Effect.gen(function* resendVerificationProgram() {
                yield* authRequest(() =>
                    authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })
                );
                setResent(true);
            })
        );

    const requestReset = () =>
        run(
            Effect.gen(function* requestResetProgram() {
                if (!email) {
                    return yield* new AuthFailure({ code: "INVALID_EMAIL" });
                }
                let shownAt: number | null = null;
                const label = yield* Effect.forkChild(
                    Effect.sync(() => {
                        shownAt = Date.now();
                        setSendingCode(true);
                    }).pipe(Effect.delay(SHOW_AFTER_MS))
                );
                const hide = Fiber.interrupt(label).pipe(
                    Effect.andThen(
                        Effect.suspend(() =>
                            shownAt === null
                                ? Effect.void
                                : Effect.forkDetach(
                                      Effect.sync(() => setSendingCode(false)).pipe(
                                          Effect.delay(Math.max(0, shownAt + SHOW_AT_LEAST_MS - Date.now()))
                                      )
                                  )
                        )
                    )
                );
                yield* authRequest(() => authClient.emailOtp.requestPasswordReset({ email })).pipe(
                    Effect.ensuring(hide)
                );
                go("reset");
            })
        );

    const resendReset = () =>
        run(
            Effect.gen(function* resendResetProgram() {
                yield* authRequest(() => authClient.emailOtp.requestPasswordReset({ email }));
                setResent(true);
            })
        );

    const reset = (event: FormEvent) => {
        event.preventDefault();
        run(
            Effect.gen(function* resetProgram() {
                yield* authRequest(() => authClient.emailOtp.resetPassword({ email, otp: code, password }));
                yield* authRequest(() => authClient.signIn.email({ email, password }));
                onDone();
            })
        );
    };

    const newPasswordReady = password.length >= MIN_PASSWORD_LENGTH;
    const changeEmail = (
        <button className={TEXT_BUTTON} onClick={() => go("sign-in")} type="button">
            {copy.otherEmail}
        </button>
    );

    if (step === "create") {
        return (
            <Screen title={copy.createTitle}>
                <form onSubmit={create}>
                    <Field
                        autoComplete="email"
                        label={copy.email.value}
                        onChange={(event) => setEmail(event.target.value.trim())}
                        value={email}
                    />
                    <Field
                        autoComplete="new-password"
                        label={copy.password.value}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={copy.passwordHint.value}
                        secret
                        value={password}
                    />
                    <ErrorLine message={error === null ? null : copy.failures[error].value} />
                    <button className={SOLID_PILL} disabled={busy || !email || !newPasswordReady} type="submit">
                        {copy.createAccount}
                    </button>
                </form>
                <button className={`${TEXT_BUTTON} mt-2`} onClick={() => go("sign-in")} type="button">
                    {copy.backToSignIn}
                </button>
            </Screen>
        );
    }

    if (step === "verify") {
        return (
            <Screen title={copy.verifyTitle}>
                <Muted>{copy.codeSent({ email })}</Muted>
                <CodeField
                    onChange={(next) => {
                        setCode(next);
                        if (next.length === CODE_LENGTH && !busy) {
                            verify(next);
                        }
                    }}
                    value={code}
                />
                <ErrorLine message={error === null ? null : copy.failures[error].value} />
                <button
                    className={SOLID_PILL}
                    disabled={busy || code.length < CODE_LENGTH}
                    onClick={() => verify(code)}
                    type="button"
                >
                    {copy.verify}
                </button>
                <div className="mt-2 flex flex-col items-center">
                    <button className={TEXT_BUTTON} onClick={resendVerification} type="button">
                        {resent ? copy.resent : copy.resend}
                    </button>
                    {changeEmail}
                </div>
            </Screen>
        );
    }

    if (step === "reset") {
        return (
            <Screen title={copy.resetTitle}>
                <Muted>{copy.resetBody({ email })}</Muted>
                <form onSubmit={reset}>
                    <CodeField onChange={setCode} value={code} />
                    <Field
                        autoComplete="new-password"
                        label={copy.newPassword.value}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={copy.passwordHint.value}
                        secret
                        value={password}
                    />
                    <ErrorLine message={error === null ? null : copy.failures[error].value} />
                    <button
                        className={SOLID_PILL}
                        disabled={busy || code.length < CODE_LENGTH || !newPasswordReady}
                        type="submit"
                    >
                        {copy.setPassword}
                    </button>
                </form>
                <div className="mt-2 flex flex-col items-center">
                    <button className={TEXT_BUTTON} onClick={resendReset} type="button">
                        {resent ? copy.resent : copy.resend}
                    </button>
                    {changeEmail}
                </div>
            </Screen>
        );
    }

    return (
        <Screen title={copy.title}>
            <button className={`${SOLID_PILL} mb-2.5`} disabled={busy} onClick={() => social("apple")} type="button">
                <AppleGlyph />
                {copy.apple}
            </button>
            <button className={LINE_PILL} disabled={busy} onClick={() => social("google")} type="button">
                <GoogleGlyph />
                {copy.google}
            </button>
            <p className="text-app-muted my-3.5 text-xs">{copy.or}</p>
            <form onSubmit={signIn}>
                <Field
                    autoComplete="email"
                    label={copy.email.value}
                    onChange={(event) => setEmail(event.target.value.trim())}
                    inputMode="email"
                    value={email}
                />
                <Field
                    autoComplete="current-password"
                    label={copy.password.value}
                    onChange={(event) => setPassword(event.target.value)}
                    secret
                    value={password}
                />
                <ErrorLine message={error === null ? null : copy.failures[error].value} />
                <button className={LINE_PILL} disabled={busy || !email || !password} type="submit">
                    {copy.signIn}
                </button>
            </form>
            <div className="mt-2 flex justify-center gap-2">
                <button className={TEXT_BUTTON} disabled={busy} onClick={() => go("create")} type="button">
                    {copy.createAccount}
                </button>
                {sendingCode ? (
                    <output className="text-app-muted px-2 py-2 text-sm">{copy.sendingCode}</output>
                ) : (
                    <button className={TEXT_BUTTON} disabled={busy} onClick={requestReset} type="button">
                        {copy.forgot}
                    </button>
                )}
            </div>
            <p className="text-app-muted mt-4 text-xs">
                {copy.agreement({
                    privacy: (
                        <SiteLink className="underline" to="/privacy">
                            {copy.privacy}
                        </SiteLink>
                    ),
                    terms: (
                        <SiteLink className="underline" to="/terms">
                            {copy.terms}
                        </SiteLink>
                    ),
                })}
            </p>
        </Screen>
    );
}
