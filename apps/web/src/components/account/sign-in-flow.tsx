import { useState } from "react";
import type { FormEvent } from "react";

import { AuthFailureError, failureMessage, unwrap } from "@/lib/account";
import { authClient } from "@/lib/auth-client";

import { LocalizedLink } from "../localized-link";
import { CODE_LENGTH, CodeField, ErrorLine, Field, LINE_PILL, Muted, Screen, SOLID_PILL, TEXT_BUTTON } from "./parts";
import { AppleGlyph, GoogleGlyph } from "./provider-icons";

const MIN_PASSWORD_LENGTH = 8;

type Step = "create" | "forgot" | "reset" | "sign-in" | "verify";

export function SignInFlow({ onDone, target }: { onDone: () => void; target: string }) {
    const [step, setStep] = useState<Step>("sign-in");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resent, setResent] = useState(false);

    const go = (next: Step) => {
        setError(null);
        setResent(false);
        setCode("");
        setPassword("");
        setStep(next);
    };

    const run = async (work: () => Promise<void>) => {
        setError(null);
        setBusy(true);
        try {
            await work();
        } catch (cause) {
            setError(failureMessage(cause instanceof AuthFailureError ? cause.error : undefined));
        } finally {
            setBusy(false);
        }
    };

    const social = (provider: "apple" | "google") =>
        run(async () => unwrap(await authClient.signIn.social({ callbackURL: target, provider })));

    const signIn = (event: FormEvent) => {
        event.preventDefault();
        return run(async () => {
            const result = await authClient.signIn.email({ email, password });
            if (result.error?.code === "EMAIL_NOT_VERIFIED") {
                go("verify");
                return;
            }
            unwrap(result);
            onDone();
        });
    };

    const create = (event: FormEvent) => {
        event.preventDefault();
        return run(async () => {
            unwrap(await authClient.signUp.email({ email, name: "", password }));
            go("verify");
        });
    };

    const verify = (otp: string) =>
        run(async () => {
            unwrap(await authClient.emailOtp.verifyEmail({ email, otp }));
            onDone();
        });

    const resendVerification = () =>
        run(async () => {
            unwrap(await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }));
            setResent(true);
        });

    const requestReset = (event: FormEvent) => {
        event.preventDefault();
        return run(async () => {
            unwrap(await authClient.emailOtp.requestPasswordReset({ email }));
            go("reset");
        });
    };

    const resendReset = () =>
        run(async () => {
            unwrap(await authClient.emailOtp.requestPasswordReset({ email }));
            setResent(true);
        });

    const reset = (event: FormEvent) => {
        event.preventDefault();
        return run(async () => {
            unwrap(await authClient.emailOtp.resetPassword({ email, otp: code, password }));
            unwrap(await authClient.signIn.email({ email, password }));
            onDone();
        });
    };

    const newPasswordReady = password.length >= MIN_PASSWORD_LENGTH;
    const changeEmail = (
        <button className={TEXT_BUTTON} onClick={() => go("sign-in")} type="button">
            Use another email
        </button>
    );

    if (step === "create") {
        return (
            <Screen title="Create an account">
                <form onSubmit={create}>
                    <Field
                        autoComplete="email"
                        label="Email"
                        onChange={(event) => setEmail(event.target.value.trim())}
                        value={email}
                    />
                    <Field
                        autoComplete="new-password"
                        label="Password"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="8 or more characters"
                        secret
                        value={password}
                    />
                    <ErrorLine message={error} />
                    <button className={SOLID_PILL} disabled={busy || !email || !newPasswordReady} type="submit">
                        Create account
                    </button>
                </form>
                <button className={`${TEXT_BUTTON} mt-2`} onClick={() => go("sign-in")} type="button">
                    Back to sign in
                </button>
            </Screen>
        );
    }

    if (step === "verify") {
        return (
            <Screen title="Check your email">
                <Muted>Code sent to {email}</Muted>
                <CodeField
                    onChange={(next) => {
                        setCode(next);
                        if (next.length === CODE_LENGTH && !busy) {
                            verify(next);
                        }
                    }}
                    value={code}
                />
                <ErrorLine message={error} />
                <button
                    className={SOLID_PILL}
                    disabled={busy || code.length < CODE_LENGTH}
                    onClick={() => verify(code)}
                    type="button"
                >
                    Verify
                </button>
                <div className="mt-2 flex flex-col items-center">
                    <button className={TEXT_BUTTON} onClick={resendVerification} type="button">
                        {resent ? "New code sent" : "Send a new code"}
                    </button>
                    {changeEmail}
                </div>
            </Screen>
        );
    }

    if (step === "forgot") {
        return (
            <Screen title="Reset your password">
                <Muted>We&apos;ll email you a code to set a new one.</Muted>
                <form onSubmit={requestReset}>
                    <Field
                        autoComplete="email"
                        label="Email"
                        onChange={(event) => setEmail(event.target.value.trim())}
                        value={email}
                    />
                    <ErrorLine message={error} />
                    <button className={SOLID_PILL} disabled={busy || !email} type="submit">
                        Send code
                    </button>
                </form>
                <button className={`${TEXT_BUTTON} mt-2`} onClick={() => go("sign-in")} type="button">
                    Back to sign in
                </button>
            </Screen>
        );
    }

    if (step === "reset") {
        return (
            <Screen title="Reset your password">
                <Muted>Enter the code we sent to {email} and choose a new password.</Muted>
                <form onSubmit={reset}>
                    <CodeField onChange={setCode} value={code} />
                    <Field
                        autoComplete="new-password"
                        label="New password"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="8 or more characters"
                        secret
                        value={password}
                    />
                    <ErrorLine message={error} />
                    <button
                        className={SOLID_PILL}
                        disabled={busy || code.length < CODE_LENGTH || !newPasswordReady}
                        type="submit"
                    >
                        Set password
                    </button>
                </form>
                <div className="mt-2 flex flex-col items-center">
                    <button className={TEXT_BUTTON} onClick={resendReset} type="button">
                        {resent ? "New code sent" : "Send a new code"}
                    </button>
                    {changeEmail}
                </div>
            </Screen>
        );
    }

    return (
        <Screen title="Sign in to Outlayr">
            <button className={`${SOLID_PILL} mb-2.5`} disabled={busy} onClick={() => social("apple")} type="button">
                <AppleGlyph />
                Continue with Apple
            </button>
            <button className={LINE_PILL} disabled={busy} onClick={() => social("google")} type="button">
                <GoogleGlyph />
                Continue with Google
            </button>
            <p className="text-app-muted my-3.5 text-xs">or</p>
            <form onSubmit={signIn}>
                <Field
                    autoComplete="email"
                    label="Email"
                    onChange={(event) => setEmail(event.target.value.trim())}
                    inputMode="email"
                    value={email}
                />
                <Field
                    autoComplete="current-password"
                    label="Password"
                    onChange={(event) => setPassword(event.target.value)}
                    secret
                    value={password}
                />
                <ErrorLine message={error} />
                <button className={LINE_PILL} disabled={busy || !email || !password} type="submit">
                    Sign in
                </button>
            </form>
            <div className="mt-2 flex justify-center gap-2">
                <button className={TEXT_BUTTON} onClick={() => go("create")} type="button">
                    Create account
                </button>
                <button className={TEXT_BUTTON} onClick={() => go("forgot")} type="button">
                    Forgot password?
                </button>
            </div>
            <p className="text-app-muted mt-4 text-xs">
                By continuing you accept the{" "}
                <LocalizedLink className="underline" to="/terms">
                    Terms
                </LocalizedLink>{" "}
                and{" "}
                <LocalizedLink className="underline" to="/privacy">
                    Privacy Policy
                </LocalizedLink>
                .
            </p>
        </Screen>
    );
}
