import { useRouter } from "expo-router";
import { Platform, ScrollView, View } from "react-native";

import { FirstRun } from "@/components/first-run";
import { LinkRow } from "@/components/list/list-row";
import { useAiGate } from "@/hooks/use-ai-gate";
import { useTranslation } from "@/i18n/context";
import { isGoogleSignInAvailable } from "@/lib/google-sign-in";
import { posthog } from "@/lib/posthog";
import { purchaseListener } from "@/lib/purchase-listener";
import { TRIGGERS_IN_SHORTCUTS } from "@/lib/wallet-shortcut";

type FirstLineDoor = "auto" | "scan" | "type";

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
    const router = useRouter();
    const t = useTranslation();
    const doors = useFirstLineDoors();
    const typeInstead = () => {
        captureDoor("type");
        router.push("/onboarding/first-entry");
    };

    return (
        <FirstRun
            eyebrow={t("onboarding.firstEntry.eyebrow")}
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
                            onPress={() => {
                                captureDoor("scan");
                                router.push("/onboarding/scan");
                            }}
                            title={t("onboarding.firstLine.scan.title")}
                        />
                    ) : null}
                </View>
            </ScrollView>
        </FirstRun>
    );
}
