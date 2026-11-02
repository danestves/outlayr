import ViewIcon from "@hugeicons-pro/core-stroke-rounded/ViewIcon";
import ViewOffSlashIcon from "@hugeicons-pro/core-stroke-rounded/ViewOffSlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Cause from "effect/Cause";
import * as Schema from "effect/Schema";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Input } from "panelui-native/components/input";
import type { InputProps } from "panelui-native/components/input";
import { OtpInput } from "panelui-native/components/otp-input";
import { useState } from "react";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";

import type { EmailSignInRoute } from "@/components/account/provider-sign-in-buttons";
import { BusyText } from "@/components/busy-text";
import { Text } from "@/components/text";
import { signInFailureDetail, signInFailureMessage } from "@/domain/account";
import { useLongWait } from "@/hooks/use-long-wait";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { authClient } from "@/lib/auth-client";
import { SILENT } from "@/state/atom-command";
import {
    checkResetCodeCommand,
    EmailAuthError,
    requestPasswordResetCommand,
    resetPasswordCommand,
    sendVerificationOtpCommand,
    signInEmailCommand,
    signUpEmailCommand,
    verifyEmailCommand,
} from "@/state/auth-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

type AuthClient = NonNullable<typeof authClient>;

const STEPS = ["email", "sign-in", "create", "verify", "reset", "new-password"] as const;
type Step = (typeof STEPS)[number];
const isStep = Schema.is(Schema.Literals(STEPS));

const CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;
const PLAUSIBLE_EMAIL = /^\S+@\S+\.\S+$/;

interface Flow {
    client: AuthClient;
    email: string;
    route: EmailSignInRoute;
}

export function EmailSignIn({ route }: { route: EmailSignInRoute }) {
    const params = useLocalSearchParams<{ email?: string; otp?: string; step?: string }>();
    if (authClient === null) {
        return null;
    }
    const flow: Flow = { client: authClient, email: params.email ?? "", route };
    const steps: Record<Step, ReactNode> = {
        create: <CreateStep {...flow} />,
        email: <EmailStep {...flow} />,
        "new-password": <NewPasswordStep {...flow} otp={params.otp ?? ""} />,
        reset: <ResetCodeStep {...flow} />,
        "sign-in": <SignInStep {...flow} />,
        verify: <VerifyStep {...flow} />,
    };
    return (
        <KeyboardAvoidingView behavior="padding" className="bg-fr-ground flex-1">
            {steps[isStep(params.step) ? params.step : "email"]}
        </KeyboardAvoidingView>
    );
}

function goTo(route: EmailSignInRoute, step: Step, email: string, otp?: string) {
    const params = { email: email.trim(), step };
    router.push({ params: otp === undefined ? params : { ...params, otp }, pathname: route });
}

function useFetchOptions() {
    const { language } = useLanguage();
    return { headers: { "accept-language": language } };
}

function useRequest<Tag extends string>() {
    const t = useTranslation();
    const [busy, setBusy] = useState<Tag | null>(null);
    const [error, setError] = useState<string | null>(null);
    const run = (tag: Tag, fire: () => void) => {
        if (busy !== null) {
            return;
        }
        setError(null);
        setBusy(tag);
        fire();
    };
    const handlers = {
        onFailure: (failed: Cause.Cause<unknown>) => {
            const failure = Cause.squash(failed);
            const cause = failure instanceof EmailAuthError ? failure.cause : failure;
            console.warn("[outlayr] email sign-in failed", signInFailureDetail(cause));
            setError(signInFailureMessage(cause, t));
        },
        onSettled: () => setBusy(null),
    };
    return { busy, error, handlers, run, setError };
}

function EmailStep({ email: givenEmail, route }: Flow) {
    const t = useTranslation();
    const [email, setEmail] = useState(givenEmail);
    const [error, setError] = useState<string | null>(null);

    const submit = () => {
        if (!PLAUSIBLE_EMAIL.test(email.trim())) {
            setError(t("auth.email.error.email"));
            return;
        }
        setError(null);
        goTo(route, "sign-in", email);
    };

    return (
        <StepLayout title={t("auth.email.start.title")}>
            <TextField
                accessibilityLabel={t("auth.email.email")}
                autoComplete="email"
                autoFocus
                errorMessage={error ?? undefined}
                keyboardType="email-address"
                onChangeText={setEmail}
                onSubmitEditing={submit}
                returnKeyType="next"
                textContentType="emailAddress"
                value={email}
            />
            <Action disabled={!email.trim()} label={t("common.continue")} onPress={submit} />
        </StepLayout>
    );
}

function SignInStep({ client, email, route }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const colors = useColors();
    const { busy, error, handlers, run } = useRequest<"sign-in" | "forgot">();
    const [password, setPassword] = useState("");
    const sending = useLongWait(busy === "forgot");
    const signIn = useAtomAction(
        signInEmailCommand,
        {
            ...handlers,
            onSuccess: (outcome) => {
                if (outcome === "verify") {
                    goTo(route, "verify", email);
                }
            },
        },
        SILENT
    );
    const requestReset = useAtomAction(
        requestPasswordResetCommand,
        { ...handlers, onSuccess: () => goTo(route, "reset", email) },
        SILENT
    );

    const submit = () => run("sign-in", () => signIn({ client, email, fetchOptions, password }));

    return (
        <StepLayout lead={<Who email={email} onChange={() => router.back()} />} title={t("auth.email.password.title")}>
            <PasswordField
                autoComplete="current-password"
                autoFocus
                errorMessage={error ?? undefined}
                label={t("auth.email.password")}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                returnKeyType="go"
                textContentType="password"
                value={password}
            />
            {sending ? (
                <BusyText className="text-subtitle" color={colors.muted}>
                    {t("auth.email.sending")}
                </BusyText>
            ) : (
                <Link
                    disabled={busy !== null}
                    label={t("auth.email.forgot")}
                    onPress={() => run("forgot", () => requestReset({ client, email, fetchOptions }))}
                />
            )}
            <Action
                busy={busy === "sign-in"}
                busyLabel="auth.signIn.pending"
                disabled={!password || busy === "forgot"}
                label={t("auth.email.signIn.action")}
                onPress={submit}
            />
            <Pressable accessibilityRole="button" className="items-center" onPress={() => goTo(route, "create", email)}>
                <Text className="font-sans-medium text-fr-muted text-subtitle">{t("auth.email.create")}</Text>
            </Pressable>
        </StepLayout>
    );
}

function CreateStep({ client, email, route }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, handlers, run } = useRequest<"create">();
    const [password, setPassword] = useState("");
    const signUp = useAtomAction(
        signUpEmailCommand,
        { ...handlers, onSuccess: () => goTo(route, "verify", email) },
        SILENT
    );

    const ready = password.length >= MIN_PASSWORD_LENGTH;
    const submit = () => run("create", () => signUp({ client, email, fetchOptions, password }));

    return (
        <StepLayout lead={<Who email={email} />} title={t("auth.email.create.title")}>
            <NewPasswordField
                errorMessage={error ?? undefined}
                onChangeText={setPassword}
                onSubmitEditing={ready ? submit : undefined}
                value={password}
            />
            <Action
                busy={busy === "create"}
                busyLabel="auth.email.sending"
                disabled={!ready}
                label={t("auth.email.create.action")}
                onPress={submit}
            />
        </StepLayout>
    );
}

function VerifyStep({ client, email }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, handlers, run } = useRequest<"code" | "resend">();
    const [code, setCode] = useState("");
    const [resent, setResent] = useState(false);
    const verifyEmail = useAtomAction(
        verifyEmailCommand,
        {
            ...handlers,
            onFailure: (failed) => {
                handlers.onFailure(failed);
                setCode("");
            },
        },
        SILENT
    );
    const sendOtp = useAtomAction(
        sendVerificationOtpCommand,
        { ...handlers, onSuccess: () => setResent(true) },
        SILENT
    );

    return (
        <StepLayout body={t("auth.email.verify.body", { email })} title={t("auth.email.verify.title")}>
            <CodeEntry
                busy={busy}
                code={code}
                error={error}
                onChange={setCode}
                onComplete={(otp) => run("code", () => verifyEmail({ client, email, fetchOptions, otp }))}
                onResend={() =>
                    run("resend", () => {
                        setResent(false);
                        sendOtp({ client, email, fetchOptions });
                    })
                }
                resent={resent}
            />
        </StepLayout>
    );
}

function ResetCodeStep({ client, email, route }: Flow) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, handlers, run } = useRequest<"code" | "resend">();
    const [code, setCode] = useState("");
    const [resent, setResent] = useState(false);
    const checkCode = useAtomAction(
        checkResetCodeCommand,
        {
            ...handlers,
            onFailure: (failed) => {
                handlers.onFailure(failed);
                setCode("");
            },
            onSuccess: (otp) => goTo(route, "new-password", email, otp),
        },
        SILENT
    );
    const requestReset = useAtomAction(
        requestPasswordResetCommand,
        { ...handlers, onSuccess: () => setResent(true) },
        SILENT
    );

    return (
        <StepLayout body={t("auth.email.verify.body", { email })} title={t("auth.email.verify.title")}>
            <CodeEntry
                busy={busy}
                code={code}
                error={error}
                onChange={setCode}
                onComplete={(otp) => run("code", () => checkCode({ client, email, fetchOptions, otp }))}
                onResend={() =>
                    run("resend", () => {
                        setResent(false);
                        requestReset({ client, email, fetchOptions });
                    })
                }
                resent={resent}
            />
        </StepLayout>
    );
}

/** The reset itself opens no session, so the new password signs in straight after. */
function NewPasswordStep({ client, email, otp }: Flow & { otp: string }) {
    const t = useTranslation();
    const fetchOptions = useFetchOptions();
    const { busy, error, handlers, run } = useRequest<"reset">();
    const [password, setPassword] = useState("");
    const resetPassword = useAtomAction(resetPasswordCommand, handlers, SILENT);

    const ready = password.length >= MIN_PASSWORD_LENGTH;
    const submit = () => run("reset", () => resetPassword({ client, email, fetchOptions, otp, password }));

    return (
        <StepLayout lead={<Who email={email} />} title={t("auth.email.newPassword.title")}>
            <NewPasswordField
                errorMessage={error ?? undefined}
                label={t("auth.email.newPassword")}
                onChangeText={setPassword}
                onSubmitEditing={ready ? submit : undefined}
                value={password}
            />
            <Action
                busy={busy === "reset"}
                busyLabel="auth.signIn.pending"
                disabled={!ready}
                label={t("auth.email.reset.action")}
                onPress={submit}
            />
        </StepLayout>
    );
}

function StepLayout({
    title,
    body,
    lead,
    children,
}: {
    title: string;
    body?: string;
    lead?: ReactNode;
    children: ReactNode;
}) {
    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="pt-safe-offset-14 android:pt-safe-offset-19 pb-safe-offset-5 px-6"
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
        >
            <Text className="font-sans-semibold text-fr-ink text-[28px] leading-[33px] tracking-[-0.5px]">{title}</Text>
            {body ? <Text className="text-fr-muted text-subtitle pt-2 leading-snug">{body}</Text> : null}
            {lead}
            <View className="gap-4 pt-6">{children}</View>
        </ScrollView>
    );
}

function Who({ email, onChange }: { email: string; onChange?: () => void }) {
    const t = useTranslation();
    return (
        <View className="flex-row items-center gap-2 pt-2">
            <Text className="text-fr-muted text-subtitle shrink" numberOfLines={1}>
                {email}
            </Text>
            {onChange ? (
                <Pressable accessibilityRole="button" hitSlop={12} onPress={onChange}>
                    <Text className="font-sans-semibold text-fr-ink text-subtitle">{t("auth.email.change")}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

function Link({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
    return (
        <Pressable
            accessibilityRole="button"
            className="self-start disabled:opacity-50"
            disabled={disabled}
            hitSlop={12}
            onPress={onPress}
        >
            <Text className="font-sans-semibold text-fr-ink text-subtitle">{label}</Text>
        </Pressable>
    );
}

function Action({
    label,
    onPress,
    disabled = false,
    busy = false,
    busyLabel,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    busy?: boolean;
    busyLabel?: TranslationKey;
}) {
    const t = useTranslation();
    const colors = useColors();
    const slow = useLongWait(busy);
    return (
        <Button
            className="bg-fr-ink border-fr-ink min-h-13 rounded-full"
            disabled={disabled || busy}
            fullWidth
            labelClassName="font-sans-semibold text-body text-fr-ground"
            onPress={onPress}
            size="lg"
        >
            {slow && busyLabel ? (
                <BusyText className="font-sans-semibold text-body" color={colors.background}>
                    {t(busyLabel)}
                </BusyText>
            ) : (
                label
            )}
        </Button>
    );
}

function TextField({ className, ...input }: InputProps) {
    const colors = useColors();
    return (
        <Input
            autoCapitalize="none"
            autoCorrect={false}
            className={`bg-fr-card text-fr-ink rounded-2xl font-sans ${className ?? ""}`}
            containerClassName="gap-2"
            selectionColor={colors.foreground}
            size="xl"
            {...input}
        />
    );
}

function PasswordField({ label, ...input }: InputProps & { label: string }) {
    const t = useTranslation();
    const [revealed, setRevealed] = useState(false);
    const colors = useColors();
    return (
        <TextField
            accessibilityLabel={label}
            endContent={
                <Pressable
                    accessibilityLabel={t(revealed ? "auth.email.hidePassword" : "auth.email.showPassword")}
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={() => setRevealed(!revealed)}
                >
                    <HugeiconsIcon
                        color={colors.muted}
                        icon={revealed ? ViewOffSlashIcon : ViewIcon}
                        size={22}
                        strokeWidth={1.7}
                    />
                </Pressable>
            }
            secureTextEntry={!revealed}
            {...input}
        />
    );
}

function NewPasswordField({ label, ...input }: InputProps & { label?: string }) {
    const t = useTranslation();
    return (
        <PasswordField
            autoComplete="new-password"
            autoFocus
            description={t("auth.email.passwordHint")}
            label={label ?? t("auth.email.password")}
            returnKeyType="go"
            textContentType="newPassword"
            {...input}
        />
    );
}

function CodeEntry({
    code,
    onChange,
    onComplete,
    onResend,
    busy,
    error,
    resent,
}: {
    code: string;
    onChange: (code: string) => void;
    onComplete: (code: string) => void;
    onResend: () => void;
    busy: "code" | "resend" | null;
    error: string | null;
    resent: boolean;
}) {
    const t = useTranslation();
    const colors = useColors();
    const checking = useLongWait(busy === "code");
    return (
        <>
            <OtpInput
                accessibilityLabel={t("auth.email.code")}
                autoComplete="one-time-code"
                autoFocus
                cellClassName="bg-fr-card h-16 w-[46px] rounded-[14px]"
                errorMessage={error ?? undefined}
                length={CODE_LENGTH}
                onChangeText={(next) => busy !== "code" && onChange(next)}
                onComplete={onComplete}
                selectionColor="transparent"
                style={{ color: "transparent", opacity: 1 }}
                value={code}
            />
            {checking ? (
                <BusyText className="text-subtitle" color={colors.muted}>
                    {t("auth.email.checking")}
                </BusyText>
            ) : (
                <Link disabled={busy !== null} label={t("auth.email.resend")} onPress={onResend} />
            )}
            {resent ? <Text className="text-fr-muted text-footnote">{t("auth.email.resent")}</Text> : null}
        </>
    );
}
