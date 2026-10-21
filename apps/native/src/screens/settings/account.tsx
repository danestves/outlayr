import { router } from "expo-router";
import { deleteItemAsync, setItemAsync } from "expo-secure-store";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { ProviderSignInButtons } from "@/components/account/provider-sign-in-buttons";
import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase, useLocalData } from "@/contexts/local-data-context";
import { setSyncEnabled } from "@/data/sync-outbox-core";
import { closeDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { accountLabel, signInFailureMessage } from "@/domain/account";
import { useTranslation } from "@/i18n/context";
import { runAccountLifecycle } from "@/lib/account-lifecycle";
import { authClient, useAuthClientSession } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { cloudAction, cloudMutation, convex } from "@/lib/convex";
import { deletionResumeSecretKey, resumePersistedCloudDeletion, resumeProviderRevocation } from "@/lib/deletion-resume";
import type { StoredDeletionPreparation } from "@/lib/deletion-resume";
import { createDeviceResetGate, writeDeviceResetMarker } from "@/lib/device-data-reset";
import { posthog } from "@/lib/posthog";
import { providerBindingFor } from "@/lib/provider-revocation";
import { useProviderSignIn } from "@/lib/use-provider-sign-in";

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

function AccountContent({ client, db }: { client: AuthClient; db: Database }) {
    const t = useTranslation();
    const { retry: reopenLocalData } = useLocalData();
    const { data: session, isPending: restoring } = useAuthClientSession();
    const { accountId } = useAuthSession();
    const [busy, setBusy] = useState<"deleteAll" | "deleteCloud" | "signOut" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { busy: signingIn, error: signInError, start } = useProviderSignIn(client);

    useEffect(() => {
        let mounted = true;
        const resumeDeletion = async () => {
            if ((await resumePersistedCloudDeletion()) && mounted) {
                router.replace("/");
            }
        };
        resumeDeletion().catch((cause: unknown) => {
            if (mounted) {
                setError(signInFailureMessage(cause, t));
            }
        });
        return () => {
            mounted = false;
        };
    }, [t]);

    const signOut = () => {
        setError(null);
        setBusy("signOut");
        runAccountLifecycle("signOut", {
            allowLocal: openLedger,
            deleteAccount: async () => {
                await client.deleteUser();
            },
            navigateToLedger: openLedger,
            quiesce: () => setSyncEnabled(db, false),
            signOut: async () => {
                await client.signOut();
            },
        })
            .catch((cause: unknown) => setError(signInFailureMessage(cause, t)))
            .finally(() => setBusy(null));
    };

    const deleteAccount = (action: "deleteAll" | "deleteCloud" = "deleteCloud") => {
        if (!activeSession) {
            return;
        }
        setError(null);
        setBusy(action);
        posthog?.reset();
        const resetGate =
            action === "deleteAll"
                ? createDeviceResetGate({
                      closeDatabase: async () => await closeDatabase(db),
                      completeCloudDeletion: async () => {
                          await resumePersistedCloudDeletion({ clearOnComplete: false, required: true });
                      },
                  })
                : null;
        runAccountLifecycle(action, {
            advanceDeletion: async (resumeSecret) => {
                if (convex === null) {
                    throw new Error("Cloud deletion is unavailable");
                }
                return await cloudMutation("accountDeletion:advance", { resumeSecret });
            },
            allowLocal: openLedger,
            beginDeviceReset:
                action === "deleteAll" ? async () => await writeDeviceResetMarker({ phase: "cloud", v: 1 }) : undefined,
            clearDeletionSecret: async () => await deleteItemAsync(deletionResumeSecretKey),
            deleteAccount: async () => undefined,
            eraseBilling: async (resumeSecret) => {
                if (convex === null) {
                    throw new Error("Cloud deletion is unavailable");
                }
                return await cloudAction("accountDeletion:eraseBilling", { resumeSecret });
            },
            markDeviceCleanupReady:
                action === "deleteAll"
                    ? async () => await writeDeviceResetMarker({ phase: "device", v: 1 })
                    : undefined,
            navigateToLedger: openLedger,
            navigateToOnboarding: () => {
                reopenLocalData();
                router.replace("/onboarding");
            },
            persistDeletionSecret: async (preparation) =>
                await setItemAsync(deletionResumeSecretKey, JSON.stringify(preparation)),
            prepareDeletion: async () => {
                if (convex === null) {
                    throw new Error("Cloud deletion is unavailable");
                }
                const binding = await providerBindingFor(activeSession.user.id);
                const preparation = await cloudMutation<
                    Record<string, never>,
                    { receiptChallenge: string; resumeSecret: string }
                >("accountDeletion:prepare", {});
                return { ...preparation, provider: binding.provider, providerSubject: binding.providerSubject };
            },
            quiesce: () => setSyncEnabled(db, false),
            resetDevice: action === "deleteAll" && resetGate ? async () => await resetGate.recover() : undefined,
            revokeProvider: async (preparation) => {
                // SAFETY: `prepareDeletion` is the only producer and adds the pair `StoredDeletionPreparation` needs.
                await resumeProviderRevocation(preparation as StoredDeletionPreparation);
            },
        })
            .catch((cause: unknown) => setError(signInFailureMessage(cause, t)))
            .finally(() => setBusy(null));
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

            {error ? <Failure message={error} /> : null}
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
