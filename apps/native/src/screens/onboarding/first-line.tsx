import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";

import { FirstRun } from "@/components/first-run";
import { LinkRow } from "@/components/list/list-row";
import { useDatabase } from "@/contexts/local-data-context";
import { useMeta } from "@/data/app-meta";
import type { MoneyGoal } from "@/domain/money-goal";
import { useAiGate } from "@/hooks/use-ai-gate";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { authClient } from "@/lib/auth-client";
import { isGoogleSignInAvailable } from "@/lib/google-sign-in";
import { useWhen } from "@/lib/lifecycle";
import { posthog } from "@/lib/posthog";
import { purchaseListener } from "@/lib/purchase-listener";
import { TRIGGERS_IN_SHORTCUTS } from "@/lib/wallet-shortcut";

import { STEP_PROGRESS } from "./progress";
import { holdScanForSignIn, scanHeldForSignIn } from "./scan-sign-in";
import { ScanSignInSheet } from "./scan-sign-in-sheet";

type FirstLineDoor = "auto" | "scan" | "type";

const GOAL_BODY: Record<MoneyGoal, TranslationKey> = {
    track: "onboarding.firstLine.goal.track",
    spendLess: "onboarding.firstLine.goal.spendLess",
    save: "onboarding.firstLine.goal.save",
    payDebt: "onboarding.firstLine.goal.payDebt",
};

function captureDoor(door: FirstLineDoor) {
    posthog?.capture("onboarding_first_line", { door });
}

export function useFirstLineDoors() {
    const gate = useAiGate();
    const auto = Platform.OS === "android" ? purchaseListener !== null : TRIGGERS_IN_SHORTCUTS;
    const provider =
        gate === "signed-out" || gate === "restoring" ? Platform.OS === "ios" || isGoogleSignInAvailable : false;
    return { auto, scan: gate === "signed-in" || provider };
}

export function OnboardingFirstLine() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const goal = useMeta(db, "moneyGoal");
    const doors = useFirstLineDoors();
    const gate = useAiGate();
    const [signInOpen, setSignInOpen] = useState(false);
    useWhen(gate === "signed-in" && scanHeldForSignIn(), () => {
        if (!scanHeldForSignIn()) {
            return;
        }
        holdScanForSignIn(false);
        setSignInOpen(false);
        router.push("/onboarding/scan");
    });
    const typeInstead = () => {
        holdScanForSignIn(false);
        setSignInOpen(false);
        captureDoor("type");
        router.push("/onboarding/first-entry");
    };
    const openScan = () => {
        captureDoor("scan");
        if (gate === "signed-in" || authClient === null) {
            router.push("/onboarding/scan");
            return;
        }
        setSignInOpen(true);
    };

    return (
        <>
            <FirstRun
                body={goal === null ? undefined : t(GOAL_BODY[goal])}
                eyebrow={t("onboarding.firstEntry.eyebrow")}
                progress={STEP_PROGRESS["first-line"]}
                skip={{ label: t("onboarding.firstLine.type"), onPress: typeInstead }}
                title={t("onboarding.firstLine.title")}
            >
                <ScrollView className="shrink grow-0">
                    <View className="border-border border-t">
                        {doors.auto ? (
                            <LinkRow
                                detail={t(
                                    Platform.OS === "android"
                                        ? "onboarding.firstLine.auto.detailAndroid"
                                        : "onboarding.firstLine.auto.detail"
                                )}
                                icon="Wallet01"
                                onPress={() => {
                                    captureDoor("auto");
                                    router.push("/onboarding/auto-log");
                                }}
                                title={t("onboarding.firstLine.auto.title")}
                            />
                        ) : null}
                        {doors.scan ? (
                            <LinkRow
                                detail={t("onboarding.firstLine.scan.detail")}
                                icon="Camera01"
                                onPress={openScan}
                                title={t("onboarding.firstLine.scan.title")}
                            />
                        ) : null}
                    </View>
                </ScrollView>
            </FirstRun>
            {authClient === null ? null : (
                <ScanSignInSheet
                    client={authClient}
                    onOpenChange={(next) => {
                        holdScanForSignIn(next && scanHeldForSignIn());
                        setSignInOpen(next);
                    }}
                    onType={typeInstead}
                    open={signInOpen}
                />
            )}
        </>
    );
}
