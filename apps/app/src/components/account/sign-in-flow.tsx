import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { Button } from "panelui-web/button";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AuthFailure, authRequest, failureKey } from "@/lib/account";
import type { FailureKey } from "@/lib/account";
import { authClient } from "@/lib/auth-client";

import { ErrorBand } from "../error-band";
import { SiteLink } from "../site-link";
import { TextField } from "../ui/text-field";
import { AuthHead, AuthSplit, CODE_LENGTH, CodeField, Divider, PasswordField } from "./auth";
import { AppleGlyph, GoogleGlyph } from "./provider-icons";

const MIN_PASSWORD_LENGTH = 8;
const SHOW_AFTER_MS = 400;
const SHOW_AT_LEAST_MS = 300;

type Step = "create" | "reset" | "sign-in" | "verify";
type Action = "create" | "other" | "reset" | "sign-in" | "verify";

const FIELD_FAILURES: ReadonlySet<FailureKey> = new Set(["code", "credentials", "email"]);

export function SignInFlow({ onDone, target }: { onDone: () => void; target: string }) {
    const copy = useIntlayer("sign-in");
    const [step, setStep] = useState<Step>("sign-in");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [pending, setPending] = useState<Action | null>(null);
    const busy = pending !== null;
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

    const run = (program: Effect.Effect<void, AuthFailure>, action: Action = "other") => {
        setError(null);
        setPending(action);
        Effect.runFork(
            program.pipe(
                Effect.catchTags({ AuthFailure: (failure) => Effect.sync(() => setError(failureKey(failure))) }),
                Effect.ensuring(Effect.sync(() => setPending(null)))
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
            ),
            "sign-in"
        );
    };

    const create = (event: FormEvent) => {
        event.preventDefault();
        run(
            Effect.gen(function* createProgram() {
                yield* authRequest(() => authClient.signUp.email({ email, name: "", password }));
                go("verify");
            }),
            "create"
        );
    };

    const verify = (otp: string) =>
        run(
            Effect.gen(function* verifyProgram() {
                yield* authRequest(() => authClient.emailOtp.verifyEmail({ email, otp }));
                onDone();
            }),
            "verify"
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
                    Effect.gen(function* showLabelProgram() {
                        shownAt = yield* Clock.currentTimeMillis;
                        setSendingCode(true);
                    }).pipe(Effect.delay(SHOW_AFTER_MS))
                );
                const hide = Fiber.interrupt(label).pipe(
                    Effect.andThen(
                        Effect.suspend(() => {
                            if (shownAt === null) {
                                return Effect.void;
                            }
                            const hideAt = shownAt + SHOW_AT_LEAST_MS;
                            return Clock.currentTimeMillis.pipe(
                                Effect.flatMap((now) =>
                                    Effect.forkDetach(
                                        Effect.sync(() => setSendingCode(false)).pipe(
                                            Effect.delay(Math.max(0, hideAt - now))
                                        )
                                    )
                                )
                            );
                        })
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
            }),
            "reset"
        );
    };

    const newPasswordReady = password.length >= MIN_PASSWORD_LENGTH;
    const failure = error === null ? null : copy.failures[error].value;
    const band =
        error !== null && !FIELD_FAILURES.has(error) ? (
            <ErrorBand className="rounded-app-md mb-4 border px-3 py-2.5">{failure}</ErrorBand>
        ) : null;
    const fieldFailure = (key: FailureKey) => (error === key ? failure : undefined);
    const label = (action: Action, idle: ReactNode, working: ReactNode) => (pending === action ? working : idle);
    const changeEmail = (
        <Button onClick={() => go("sign-in")} size="sm" variant="link" className="px-0">
            {copy.otherEmail}
        </Button>
    );

    if (step === "create") {
        return (
            <AuthSplit footer={<Agreement />}>
                <AuthHead title={copy.createTitle} />
                {band}
                <form className="flex flex-col gap-4" onSubmit={create}>
                    <TextField
                        autoComplete="email"
                        error={fieldFailure("email")}
                        inputMode="email"
                        label={copy.email}
                        onChange={(event) => setEmail(event.target.value.trim())}
                        value={email}
                    />
                    <PasswordField
                        autoComplete="new-password"
                        label={copy.password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={copy.passwordHint.value}
                        value={password}
                    />
                    <Button
                        aria-busy={pending === "create"}
                        className="w-full"
                        disabled={busy || !email || !newPasswordReady}
                        type="submit"
                    >
                        {label("create", copy.createAccount, copy.creating)}
                    </Button>
                </form>
                <div className="mt-3 flex justify-center">
                    <Button className="px-0" onClick={() => go("sign-in")} size="sm" variant="link">
                        {copy.backToSignIn}
                    </Button>
                </div>
            </AuthSplit>
        );
    }

    if (step === "verify") {
        const locked = error === "attempts";
        return (
            <AuthSplit>
                <AuthHead body={copy.codeSent({ email })} title={copy.verifyTitle} />
                <CodeField
                    disabled={locked}
                    error={fieldFailure("code")}
                    onChange={(next) => {
                        setCode(next);
                        if (next.length === CODE_LENGTH && !busy) {
                            verify(next);
                        }
                    }}
                    value={code}
                />
                {band}
                {locked ? (
                    <>
                        <Button className="w-full" disabled={busy} onClick={resendVerification}>
                            {copy.resend}
                        </Button>
                        <div className="mt-3 flex justify-center">{changeEmail}</div>
                    </>
                ) : (
                    <>
                        <Button
                            aria-busy={pending === "verify"}
                            className="w-full"
                            disabled={busy || code.length < CODE_LENGTH}
                            onClick={() => verify(code)}
                        >
                            {label("verify", copy.verify, copy.verifying)}
                        </Button>
                        <div className="mt-3 flex justify-between">
                            <Button
                                className="px-0"
                                disabled={busy}
                                onClick={resendVerification}
                                size="sm"
                                variant="link"
                            >
                                {resent ? copy.resent : copy.resend}
                            </Button>
                            {changeEmail}
                        </div>
                    </>
                )}
            </AuthSplit>
        );
    }

    if (step === "reset") {
        return (
            <AuthSplit>
                <AuthHead body={copy.resetBody({ email })} title={copy.resetTitle} />
                <form onSubmit={reset}>
                    <CodeField error={fieldFailure("code")} onChange={setCode} value={code} />
                    {band}
                    <div className="flex flex-col gap-4">
                        <PasswordField
                            autoComplete="new-password"
                            label={copy.newPassword}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder={copy.passwordHint.value}
                            value={password}
                        />
                        <Button
                            aria-busy={pending === "reset"}
                            className="w-full"
                            disabled={busy || code.length < CODE_LENGTH || !newPasswordReady}
                            type="submit"
                        >
                            {label("reset", copy.setPassword, copy.saving)}
                        </Button>
                    </div>
                </form>
                <div className="mt-3 flex justify-between">
                    <Button className="px-0" disabled={busy} onClick={resendReset} size="sm" variant="link">
                        {resent ? copy.resent : copy.resend}
                    </Button>
                    {changeEmail}
                </div>
            </AuthSplit>
        );
    }

    return (
        <AuthSplit footer={<Agreement />}>
            <AuthHead title={copy.title} />
            {band}
            <div className="flex flex-col gap-2.5">
                <Button className="w-full" disabled={busy} onClick={() => social("apple")} variant="outline">
                    <AppleGlyph />
                    {copy.apple}
                </Button>
                <Button className="w-full" disabled={busy} onClick={() => social("google")} variant="outline">
                    <GoogleGlyph />
                    {copy.google}
                </Button>
            </div>
            <Divider>{copy.or}</Divider>
            <form className="flex flex-col gap-4" onSubmit={signIn}>
                <TextField
                    autoComplete="email"
                    error={fieldFailure("email")}
                    inputMode="email"
                    label={copy.email}
                    onChange={(event) => setEmail(event.target.value.trim())}
                    value={email}
                />
                <PasswordField
                    autoComplete="current-password"
                    error={fieldFailure("credentials")}
                    label={copy.password}
                    onChange={(event) => setPassword(event.target.value)}
                    value={password}
                />
                <Button
                    aria-busy={pending === "sign-in"}
                    className="w-full"
                    disabled={busy || !email || !password}
                    type="submit"
                >
                    {label("sign-in", copy.signIn, copy.signingIn)}
                </Button>
            </form>
            <div className="mt-3 flex justify-between">
                <Button className="px-0" disabled={busy} onClick={() => go("create")} size="sm" variant="link">
                    {copy.createAccount}
                </Button>
                {sendingCode ? (
                    <output className="text-muted-foreground text-app-label">{copy.sendingCode}</output>
                ) : (
                    <Button className="px-0" disabled={busy} onClick={requestReset} size="sm" variant="link">
                        {copy.forgot}
                    </Button>
                )}
            </div>
        </AuthSplit>
    );
}

function Agreement() {
    const copy = useIntlayer("sign-in");
    return (
        <p className="text-muted-foreground text-app-caption">
            {copy.agreement({
                privacy: (
                    <SiteLink className="text-foreground underline underline-offset-2" to="/privacy">
                        {copy.privacy}
                    </SiteLink>
                ),
                terms: (
                    <SiteLink className="text-foreground underline underline-offset-2" to="/terms">
                        {copy.terms}
                    </SiteLink>
                ),
            })}
        </p>
    );
}
