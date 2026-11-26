import * as Cause from "effect/Cause";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";

import { ProviderSignInButtons } from "@/components/account/provider-sign-in-buttons";
import { AiConsentGate } from "@/components/ai-consent";
import { FirstRun } from "@/components/first-run";
import { useDatabase } from "@/contexts/local-data-context";
import { useAiConsent } from "@/data/settings";
import { useAiGate } from "@/hooks/use-ai-gate";
import { useTranslation } from "@/i18n/context";
import { authClient } from "@/lib/auth-client";
import { useProviderSignIn } from "@/lib/use-provider-sign-in";
import { ScanFlowScreen } from "@/screens/transaction/scan";
import { SILENT } from "@/state/atom-command";
import { saveScanFirstEntryCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";

type AuthClient = NonNullable<typeof authClient>;

export function OnboardingScan() {
    const gate = useAiGate();
    if (gate !== "signed-in") {
        return <ScanSignIn restoring={gate === "restoring"} />;
    }
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ScanConsentFlow />
        </>
    );
}

function ScanConsentFlow() {
    const consent = useAiConsent(useDatabase());
    if (consent === "allowed") {
        return <ScanEntry />;
    }
    return (
        <View className="pt-safe flex-1">
            <AiConsentGate />
        </View>
    );
}

function ScanEntry() {
    const db = useDatabase();
    const router = useRouter();
    const recordSaved = useAtomAction(
        saveScanFirstEntryCommand,
        {
            onFailure: (cause) => console.error("Marking the scanned first entry failed", Cause.squash(cause)),
            onSettled: () => router.replace("/onboarding/rhythm"),
        },
        SILENT
    );
    return (
        <View className="pt-safe bg-background flex-1">
            <ScanFlowScreen
                onNeedsForm={() => router.replace("/onboarding/first-entry")}
                onSaved={() => recordSaved(db)}
            />
        </View>
    );
}

function ScanSignIn({ restoring }: { restoring: boolean }) {
    if (authClient === null) {
        return <ScanSignInUnavailable />;
    }
    return <ScanSignInButtons client={authClient} restoring={restoring} />;
}

function ScanSignInUnavailable() {
    const router = useRouter();
    const t = useTranslation();
    return (
        <FirstRun
            body={t("onboarding.scan.signInBody")}
            eyebrow={t("onboarding.firstLine.scan.title")}
            skip={{ label: t("onboarding.firstLine.type"), onPress: () => router.replace("/onboarding/first-entry") }}
            title={t("onboarding.scan.signInTitle")}
        />
    );
}

function ScanSignInButtons({ client, restoring }: { client: AuthClient; restoring: boolean }) {
    const router = useRouter();
    const t = useTranslation();
    const { busy, error, start } = useProviderSignIn(client);
    return (
        <FirstRun
            body={t("onboarding.scan.signInBody")}
            error={error}
            eyebrow={t("onboarding.firstLine.scan.title")}
            skip={{ label: t("onboarding.firstLine.type"), onPress: () => router.replace("/onboarding/first-entry") }}
            title={t("onboarding.scan.signInTitle")}
        >
            <ProviderSignInButtons busy={busy} disabled={restoring} start={start} />
        </FirstRun>
    );
}
