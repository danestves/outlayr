import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";

import { AutoLogSourceRow } from "@/components/auto-log-source-row";
import { FirstRun } from "@/components/first-run";
import { MonoLabel } from "@/components/mono-label";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useAutoLogSources } from "@/hooks/use-auto-log-sources";
import { useBankTexts } from "@/hooks/use-bank-texts";
import { useRegionCode } from "@/hooks/use-region-code";
import { useTranslation } from "@/i18n/context";
import { setupStarted, trackAutologSetup } from "@/lib/autolog-events";

import { OnboardingBankTexts } from "./bank-texts";
import { STEP_PROGRESS } from "./progress";

export function OnboardingAutoLog() {
    const db = useDatabase();
    const region = useRegionCode();
    const currency = useGlobalCurrency(db);
    const bankTexts = useBankTexts();

    if (bankTexts && (region === "VE" || currency === "VES")) {
        return <OnboardingBankTexts bankTexts={bankTexts} />;
    }
    return <AutoLogSources />;
}

function AutoLogSources() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const sources = useAutoLogSources(db);
    const on = sources.filter((source) => source.on).length;
    const skipUnset = () => {
        for (const source of sources) {
            if (source.trigger !== undefined && !source.on && !setupStarted(source.trigger)) {
                trackAutologSetup({ outcome: "skipped", surface: "onboarding", trigger: source.trigger });
            }
        }
        router.push("/onboarding/smart-features");
    };

    return (
        <FirstRun
            action={{ label: t("common.continue"), onPress: skipUnset }}
            eyebrow={t("onboarding.autoLog.eyebrow")}
            progress={STEP_PROGRESS["auto-log"]}
            title={t("onboarding.autoLog.title")}
        >
            <ScrollView className="shrink grow-0">
                <View className="items-end pb-2">
                    <MonoLabel className="text-fr-muted">
                        {t("onboarding.autoLog.count", { on: String(on), total: String(sources.length) })}
                    </MonoLabel>
                </View>
                <View className="border-border border-t">
                    {sources.map((source) => (
                        <AutoLogSourceRow key={source.id} source={source} />
                    ))}
                </View>
            </ScrollView>
        </FirstRun>
    );
}
