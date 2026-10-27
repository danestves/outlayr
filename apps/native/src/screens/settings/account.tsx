import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { ProviderSignInButtons } from "@/components/account/provider-sign-in-buttons";
import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase, useLocalData } from "@/contexts/local-data-context";
import type { Database } from "@/db/client";
import { accountLabel, signInFailureMessage } from "@/domain/account";
import { useTranslation } from "@/i18n/context";
import { authClient, useAuthClientSession } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { CloudError } from "@/lib/cloud-error";
import { resumePersistedCloudDeletion } from "@/lib/deletion-resume";
import { posthog } from "@/lib/posthog";
import { appRuntime } from "@/lib/runtime";
import { useProviderSignIn } from "@/lib/use-provider-sign-in";
import { SILENT } from "@/state/atom-command";
import { deleteAccountCommand, signOutCommand } from "@/state/cloud-commands";
import { useAtomCommand } from "@/state/use-atom-command";

type AuthClient = NonNullable<typeof authClient>;
export function Account() {
    const db = useDatabase();
    if (authClient === null) {
        return <AccountUnavailable />;
    }
    return <AccountContent client={authClient} db={db} />;
}

function AccountUnavailable() {
    const t = useTranslation();
    return (
        <SettingsScreen>
            <Header
                detail={t("settings.account.unavailableDetail")}
                eyebrow={t("settings.account.eyebrow")}
                title={t("settings.account.unavailable")}
            />
        </SettingsScreen>
    );
}

function openLedger() {
    router.replace("/");
}

const resumeDeletionAtom = appRuntime
    .atom(
        resumePersistedCloudDeletion().pipe(
            Effect.uninterruptible,
            Effect.tap((resumed) => (resumed ? Effect.sync(openLedger) : Effect.void))
        )
    )
    .pipe(Atom.withLabel("account:resume-deletion"));

function failureMessage(cause: Cause.Cause<unknown>, t: Parameters<typeof signInFailureMessage>[1]) {
    const failure = Cause.squash(cause);
    return signInFailureMessage(failure instanceof CloudError ? failure.cause : failure, t);
}

function AccountContent({ client, db }: { client: AuthClient; db: Database }) {
    const t = useTranslation();
    const { retry: reopenLocalData } = useLocalData();
    const { data: session, isPending: restoring } = useAuthClientSession();
    const { accountId } = useAuthSession();
    const [busy, setBusy] = useState<"deleteAll" | "deleteCloud" | "signOut" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { busy: signingIn, error: signInError, start } = useProviderSignIn(client);
    const signOutAccount = useAtomCommand(signOutCommand, SILENT);
    const deleteAccountRun = useAtomCommand(deleteAccountCommand, SILENT);

    const resumed = useAtomValue(resumeDeletionAtom);
    const [resumeAcknowledged, setResumeAcknowledged] = useState(false);
    const resumeFailure =
        AsyncResult.isFailure(resumed) && !resumeAcknowledged ? failureMessage(resumed.cause, t) : null;
    const shownError = error ?? resumeFailure;
    const clearError = () => {
        setError(null);
        setResumeAcknowledged(true);
    };

    const finish = (result: AsyncResult.AsyncResult<unknown, unknown>) => {
        if (AsyncResult.isFailure(result)) {
            setError(signInFailureMessage(Cause.squash(result.cause), t));
        }
        setBusy(null);
    };

    const signOut = () => {
        clearError();
        setBusy("signOut");
        signOutAccount({ allowLocal: openLedger, client, db, navigateToLedger: openLedger }).then(finish);
    };

    const deleteAccount = (action: "deleteAll" | "deleteCloud" = "deleteCloud") => {
        if (!activeSession) {
            return;
        }
        clearError();
        setBusy(action);
        posthog?.reset();
        deleteAccountRun({
            action,
            allowLocal: openLedger,
            db,
            navigateToLedger: openLedger,
            navigateToOnboarding: () => {
                reopenLocalData();
                router.replace("/onboarding");
            },
            userId: activeSession.user.id,
        }).then(finish);
    };

    const confirmDelete = () => {
        Alert.alert(t("settings.account.deleteConfirmTitle"), t("settings.account.deleteConfirmBody"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => deleteAccount(),
                style: "destructive",
                text: t("settings.account.deleteConfirm"),
            },
        ]);
    };

    const confirmDeleteDevice = () => {
        Alert.alert(t("settings.account.eraseDeviceConfirmTitle"), t("settings.account.eraseDeviceConfirmBody"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => deleteAccount("deleteAll"),
                style: "destructive",
                text: t("settings.account.eraseDeviceConfirm"),
            },
        ]);
    };

    const activeSession = accountId === null ? null : session;

    if (!activeSession && restoring) {
        return (
            <SettingsScreen>
                <Header eyebrow={t("settings.account.eyebrow")} title={t("settings.account.checking")} />
            </SettingsScreen>
        );
    }

    if (!activeSession) {
        return (
            <SettingsScreen>
                <Header
                    detail={t("settings.account.signedOutDetail")}
                    eyebrow={t("settings.account.eyebrow")}
                    title={t("settings.account.notSignedIn")}
                />

                <SettingsSection
                    footer={t("settings.account.signInFooter")}
                    title={t("settings.account.signInSection")}
                >
                    <View className="py-4">
                        <ProviderSignInButtons busy={signingIn} emailRoute="/settings/email" start={start} />
                    </View>
                </SettingsSection>

                {signInError ? <Failure message={signInError} /> : null}
            </SettingsScreen>
        );
    }

    const label = accountLabel(activeSession.user, t);
    const email = activeSession.user.email?.trim();

    return (
        <SettingsScreen>
            <Header
                detail={email && email !== label ? email : undefined}
                eyebrow={t("settings.account.signedInAs")}
                title={label}
            />

            <SettingsSection footer={t("settings.account.signOutFooter")} title={t("settings.account.sectionTitle")}>
                <LinkRow
                    destructive
                    icon="Logout01"
                    onPress={busy === null ? signOut : undefined}
                    title={t("settings.account.signOut")}
                    value={busy === "signOut" ? t("settings.account.signingOut") : undefined}
                />
            </SettingsSection>

            <SettingsSection footer={t("settings.account.deleteFooter")} title={t("settings.account.deleteSection")}>
                <LinkRow
                    destructive
                    icon="UserRemove01"
                    onPress={busy === null ? confirmDelete : undefined}
                    title={t("settings.account.delete")}
                    value={busy === "deleteCloud" ? t("settings.account.deleting") : undefined}
                />
            </SettingsSection>

            <SettingsSection
                footer={t("settings.account.eraseDeviceFooter")}
                title={t("settings.account.eraseDeviceSection")}
            >
                <LinkRow
                    destructive
                    icon="UserRemove01"
                    onPress={busy === null ? confirmDeleteDevice : undefined}
                    title={t("settings.account.eraseDevice")}
                    value={busy === "deleteAll" ? t("settings.account.deleting") : undefined}
                />
            </SettingsSection>

            {shownError ? <Failure message={shownError} /> : null}
        </SettingsScreen>
    );
}

function Header({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
    return (
        <View className="gap-1.5 pt-6">
            <MonoLabel>{eyebrow}</MonoLabel>
            <Text className="font-sans-semibold text-foreground text-title">{title}</Text>
            {detail ? <Text className="text-muted text-subtitle pt-1 leading-snug">{detail}</Text> : null}
        </View>
    );
}

function Failure({ message }: { message: string }) {
    return <Text className="text-danger text-subtitle pt-4 leading-snug">{message}</Text>;
}
