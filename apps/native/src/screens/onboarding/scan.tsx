import * as Cause from "effect/Cause";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";

import { ProviderSignInButtons } from "@/components/account/provider-sign-in-buttons";
import { AiConsentGate } from "@/components/ai-consent";
import { FirstRun } from "@/components/first-run";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useAiConsent } from "@/data/settings";
import { useAiGate } from "@/hooks/use-ai-gate";
import { useTranslation } from "@/i18n/context";
import { authClient } from "@/lib/auth-client";
import { useLedgerAdoption } from "@/lib/ledger-adoption";
import { useWhen } from "@/lib/lifecycle";
import { ScanFlowScreen } from "@/screens/transaction/scan";
import { SILENT } from "@/state/atom-command";
import { saveScanFirstEntryCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { useFinishOnboarding } from "./finish";
import { firstEntryHref } from "./first-entry-seed";
import { STEP_PROGRESS } from "./progress";
import { useScanSignIn } from "./scan-sign-in";
import type { AuthClient } from "./scan-sign-in";

export function OnboardingScan() {
    const gate = useAiGate();
    if (gate !== "signed-in") {
        return <ScanSignIn />;
    }
    return <ScanAdoptionGate />;
}

function ScanAdoptionGate() {
    const { status } = useLedgerAdoption();
    const { clearFailed, failed, finish } = useFinishOnboarding();
    const t = useTranslation();
    const asked = status === "ask";
    useWhen(asked, () => {
        finish();
    });
    if (failed !== null) {
        return (
            <FirstRun
                action={{
                    label: t("common.retry"),
                    onPress: () => {
                        clearFailed();
                        finish();
                    },
                }}
                error={failed}
                eyebrow={t("onboarding.firstLine.scan.title")}
                progress={STEP_PROGRESS.scan}
                title={t("onboarding.scan.signInTitle")}
            />
        );
    }
    if (status !== "settled") {
        return <ScanSignIn />;
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
    const t = useTranslation();
    const currency = useGlobalCurrency(db);
    const typeInstead = () => router.replace("/onboarding/first-entry");
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
                limitFallback={{ label: t("onboarding.firstLine.type"), onPress: typeInstead }}
                onNeedsForm={(draft) => router.replace(firstEntryHref(draft, currency))}
                onSaved={() => recordSaved(db)}
            />
        </View>
    );
}

function ScanSignIn() {
    if (authClient === null) {
        return <ScanSignInUnavailable />;
    }
    return <ScanSignInButtons client={authClient} />;
}

function ScanSignInUnavailable() {
    const router = useRouter();
    const t = useTranslation();
    return (
        <FirstRun
            body={t("onboarding.scan.signInBody")}
            eyebrow={t("onboarding.firstLine.scan.title")}
            progress={STEP_PROGRESS.scan}
            skip={{ label: t("onboarding.firstLine.type"), onPress: () => router.replace("/onboarding/first-entry") }}
            title={t("onboarding.scan.signInTitle")}
        />
    );
}

function ScanSignInButtons({ client }: { client: AuthClient }) {
    const router = useRouter();
    const t = useTranslation();
    const { restoring, signIn } = useScanSignIn(client);
    return (
        <FirstRun
            body={t("onboarding.scan.signInBody")}
            error={signIn.error}
            eyebrow={t("onboarding.firstLine.scan.title")}
            progress={STEP_PROGRESS.scan}
            skip={{ label: t("onboarding.firstLine.type"), onPress: () => router.replace("/onboarding/first-entry") }}
            title={t("onboarding.scan.signInTitle")}
        >
            <ProviderSignInButtons busy={signIn.busy} disabled={restoring} start={signIn.start} />
        </FirstRun>
    );
}
