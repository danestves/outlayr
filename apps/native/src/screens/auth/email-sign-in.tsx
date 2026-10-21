import ViewIcon from "@hugeicons-pro/core-stroke-rounded/ViewIcon";
import ViewOffSlashIcon from "@hugeicons-pro/core-stroke-rounded/ViewOffSlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { z } from "zod";

import type { EmailSignInRoute } from "@/components/account/provider-sign-in-buttons";
import { FirstRun } from "@/components/first-run";
import { MonoLabel } from "@/components/mono-label";
import { Text, TextInput } from "@/components/text";
import { cn } from "@/components/tw";
import { signInFailureDetail, signInFailureMessage } from "@/domain/account";
import { useLanguage, useTranslation } from "@/i18n/context";
import { authClient } from "@/lib/auth-client";
import { persistProviderBinding } from "@/lib/provider-revocation";

type AuthClient = NonNullable<typeof authClient>;

const STEPS = ["sign-in", "create", "verify", "forgot", "reset"] as const;
type Step = (typeof STEPS)[number];
const stepParam = z.enum(STEPS).catch("sign-in");

const CODE_LENGTH = 6;
const CODE_SLOTS = Array.from({ length: CODE_LENGTH }, (_, slot) => slot);
const MIN_PASSWORD_LENGTH = 8;
const NON_DIGITS = /\D/g;

interface Flow {
    client: AuthClient;
    email: string;
    route: EmailSignInRoute;
}

export function EmailSignIn({ route }: { route: EmailSignInRoute }) {
    const params = useLocalSearchParams<{ email?: string; step?: string }>();
    if (authClient === null) {
        return null;
    }
    const flow: Flow = { client: authClient, email: params.email ?? "", route };
    const steps: Record<Step, ReactNode> = {
        create: <CreateStep {...flow} />,
        forgot: <ForgotStep {...flow} />,
        reset: <ResetStep {...flow} />,
        "sign-in": <SignInStep {...flow} />,
        verify: <VerifyStep {...flow} />,
    };
    return (
        <KeyboardAvoidingView behavior="padding" className="bg-fr-ground flex-1">
            {steps[stepParam.parse(params.step)]}
        </KeyboardAvoidingView>
    );
}

function goTo(route: EmailSignInRoute, step: Step, email: string) {
    router.push({ params: { email: email.trim(), step }, pathname: route });
}

function useFetchOptions() {
    const { language } = useLanguage();
    return { headers: { "accept-language": language } };
}

function useRequest() {
    const t = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const run = (work: () => Promise<void>) => {
        setError(null);
        setBusy(true);
        work()
            .catch((cause: unknown) => {
                console.warn("[outlayr] email sign-in failed", signInFailureDetail(cause));
                setError(signInFailureMessage(cause, t));
            })
            .finally(() => setBusy(false));
    };
    return { busy, error, run };
}

function unwrap<T>({ data, error }: { data: T | null; error: { message?: string } | null }): T {
    if (error !== null || data === null) {
        throw Object.assign(new Error(error?.message ?? "Email sign-in failed"), error);
    }
    return data;
}

async function bindPassword(user: { email: string; id: string }) {
    await persistProviderBinding({ betterAuthUserId: user.id, provider: "password", providerSubject: user.email });
}

function SignInStep({ client, email: givenEmail, route }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, run } = useRequest();
    const [email, setEmail] = useState(givenEmail);
    const [password, setPassword] = useState("");

    const submit = () =>
        run(async () => {
            const result = await client.signIn.email({ email: email.trim(), fetchOptions, password });
            // Better Auth has just sent a fresh code for exactly this case.
            if (result.error?.code === "EMAIL_NOT_VERIFIED") {
                goTo(route, "verify", email);
                return;
            }
            await bindPassword(unwrap(result).user);
        });

    return (
        <FirstRun
            action={{ disabled: busy || !email || !password, label: t("auth.email.signIn.action"), onPress: submit }}
            error={error}
            eyebrow={t("auth.email.email")}
            skip={{ label: t("auth.email.create"), onPress: () => goTo(route, "create", email) }}
            title={t("auth.email.signIn.title")}
        >
            <Fields>
                <EmailField autoFocus={!email} onChangeText={setEmail} value={email} />
                <Field
                    autoComplete="current-password"
                    autoFocus={Boolean(email)}
                    label={t("auth.email.password")}
                    onChangeText={setPassword}
                    onSubmitEditing={submit}
                    secureTextEntry
                    textContentType="password"
                    value={password}
                />
                <Pressable accessibilityRole="button" className="self-end" onPress={() => goTo(route, "forgot", email)}>
                    <Text className="font-sans-medium text-caption text-fr-ink">{t("auth.email.forgot")}</Text>
                </Pressable>
            </Fields>
        </FirstRun>
    );
}

function CreateStep({ client, email: givenEmail, route }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, run } = useRequest();
    const [email, setEmail] = useState(givenEmail);
    const [password, setPassword] = useState("");
    const ready = Boolean(email) && password.length >= MIN_PASSWORD_LENGTH;

    const submit = () =>
        run(async () => {
            unwrap(await client.signUp.email({ email: email.trim(), fetchOptions, name: "", password }));
            goTo(route, "verify", email);
        });

    return (
        <FirstRun
            action={{ disabled: busy || !ready, label: t("auth.email.create.action"), onPress: submit }}
            error={error}
            eyebrow={t("auth.email.email")}
            title={t("auth.email.create.title")}
        >
            <Fields>
                <EmailField autoFocus={!email} onChangeText={setEmail} value={email} />
                <NewPasswordField autoFocus={Boolean(email)} onChangeText={setPassword} value={password} />
            </Fields>
        </FirstRun>
    );
}

function VerifyStep({ client, email }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, run } = useRequest();
    const [code, setCode] = useState("");
    const [resent, setResent] = useState(false);

    const verify = (otp: string) =>
        run(async () => {
            await bindPassword(unwrap(await client.emailOtp.verifyEmail({ email, fetchOptions, otp })).user);
        });
    const resend = () =>
        run(async () => {
            setResent(false);
            unwrap(await client.emailOtp.sendVerificationOtp({ email, fetchOptions, type: "email-verification" }));
            setResent(true);
        });

    return (
        <FirstRun
            action={{
                disabled: busy || code.length < CODE_LENGTH,
                label: t("auth.email.verify.action"),
                onPress: () => verify(code),
            }}
            body={t("auth.email.verify.body", { email })}
            error={error}
            eyebrow={t("auth.email.email")}
            footnote={resent ? t("auth.email.resent") : undefined}
            skip={{ label: t("auth.email.resend"), onPress: resend }}
            title={t("auth.email.verify.title")}
        >
            <Fields>
                <CodeField
                    onChange={(next) => {
                        setCode(next);
                        if (next.length === CODE_LENGTH && !busy) {
                            verify(next);
                        }
                    }}
                    value={code}
                />
            </Fields>
        </FirstRun>
    );
}

function ForgotStep({ client, email: givenEmail, route }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, run } = useRequest();
    const [email, setEmail] = useState(givenEmail);

    const submit = () =>
        run(async () => {
            unwrap(await client.emailOtp.requestPasswordReset({ email: email.trim(), fetchOptions }));
            goTo(route, "reset", email);
        });

    return (
        <FirstRun
            action={{ disabled: busy || !email, label: t("auth.email.forgot.action"), onPress: submit }}
            body={t("auth.email.forgot.body")}
            error={error}
            eyebrow={t("auth.email.email")}
            title={t("auth.email.forgot.title")}
        >
            <Fields>
                <EmailField autoFocus onChangeText={setEmail} onSubmitEditing={submit} value={email} />
            </Fields>
        </FirstRun>
    );
}

/** The reset itself opens no session, so the new password signs in straight after. */
function ResetStep({ client, email }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, run } = useRequest();
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [resent, setResent] = useState(false);
    const ready = code.length === CODE_LENGTH && password.length >= MIN_PASSWORD_LENGTH;

    const submit = () =>
        run(async () => {
            unwrap(await client.emailOtp.resetPassword({ email, fetchOptions, otp: code, password }));
            await bindPassword(unwrap(await client.signIn.email({ email, fetchOptions, password })).user);
        });
    const resend = () =>
        run(async () => {
            setResent(false);
            unwrap(await client.emailOtp.requestPasswordReset({ email, fetchOptions }));
            setResent(true);
        });

    return (
        <FirstRun
            action={{ disabled: busy || !ready, label: t("auth.email.reset.action"), onPress: submit }}
            body={t("auth.email.reset.body", { email })}
            error={error}
            eyebrow={t("auth.email.email")}
            footnote={resent ? t("auth.email.resent") : undefined}
            skip={{ label: t("auth.email.resend"), onPress: resend }}
            title={t("auth.email.forgot.title")}
        >
            <Fields>
                <CodeField onChange={setCode} value={code} />
                <NewPasswordField label={t("auth.email.newPassword")} onChangeText={setPassword} value={password} />
            </Fields>
        </FirstRun>
    );
}

function Fields({ children }: { children: ReactNode }) {
    return <View className="flex-1 gap-4 pt-7">{children}</View>;
}

type FieldProps = ComponentProps<typeof TextInput> & { hint?: string; label: string };

function Field({ hint, label, secureTextEntry, ...input }: FieldProps) {
    const t = useTranslation();
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);
    // SAFETY: both names are declared in global.css, so each slot resolves.
    const [ink, muted] = useCSSVariable(["--fr-ink", "--fr-muted"]) as string[];

    return (
        <View className="gap-2">
            <MonoLabel className="text-fr-muted">{label}</MonoLabel>
            <View
                className={cn(
                    "bg-fr-card h-13 flex-row items-center gap-3 rounded-[14px] border px-4",
                    focused ? "border-fr-ink" : "border-fr-rule"
                )}
            >
                <TextInput
                    accessibilityLabel={label}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="text-callout text-fr-ink flex-1 font-sans"
                    onBlur={() => setFocused(false)}
                    onFocus={() => setFocused(true)}
                    secureTextEntry={secureTextEntry && !revealed}
                    selectionColor={ink}
                    {...input}
                />
                {secureTextEntry ? (
                    <Pressable
                        accessibilityLabel={t(revealed ? "auth.email.hidePassword" : "auth.email.showPassword")}
                        accessibilityRole="button"
                        hitSlop={12}
                        onPress={() => setRevealed(!revealed)}
                    >
                        <HugeiconsIcon
                            color={muted}
                            icon={revealed ? ViewOffSlashIcon : ViewIcon}
                            size={20}
                            strokeWidth={1.7}
                        />
                    </Pressable>
                ) : null}
            </View>
            {hint ? <Text className="text-fr-muted text-footnote">{hint}</Text> : null}
        </View>
    );
}

function EmailField(props: Omit<FieldProps, "label">) {
    const t = useTranslation();
    return (
        <Field
            autoComplete="email"
            keyboardType="email-address"
            label={t("auth.email.email")}
            textContentType="emailAddress"
            {...props}
        />
    );
}

function NewPasswordField(props: Omit<FieldProps, "label"> & { label?: string }) {
    const t = useTranslation();
    return (
        <Field
            autoComplete="new-password"
            hint={t("auth.email.passwordHint")}
            label={t("auth.email.password")}
            secureTextEntry
            textContentType="newPassword"
            {...props}
        />
    );
}

/** Transparent text, not zero opacity: keeps paste, one-time-code autofill and VoiceOver working. */
function CodeField({ onChange, value }: { onChange: (code: string) => void; value: string }) {
    const t = useTranslation();
    return (
        <View className="gap-2">
            <MonoLabel className="text-fr-muted">{t("auth.email.code")}</MonoLabel>
            <View>
                <View className="flex-row gap-2" pointerEvents="none">
                    {CODE_SLOTS.map((slot) => (
                        <View
                            className={cn(
                                "bg-fr-card h-15 flex-1 items-center justify-center rounded-[14px] border",
                                slot === value.length ? "border-fr-ink" : "border-fr-rule"
                            )}
                            key={slot}
                        >
                            <Text className="font-mono-medium text-fr-ink text-[26px]">{value[slot] ?? ""}</Text>
                        </View>
                    ))}
                </View>
                <TextInput
                    accessibilityLabel={t("auth.email.code")}
                    autoComplete="one-time-code"
                    autoFocus
                    caretHidden
                    className="absolute inset-0 text-transparent"
                    keyboardType="number-pad"
                    maxLength={CODE_LENGTH}
                    onChangeText={(text) => onChange(text.replace(NON_DIGITS, "").slice(0, CODE_LENGTH))}
                    selectionColor="transparent"
                    textContentType="oneTimeCode"
                    value={value}
                />
            </View>
        </View>
    );
}
