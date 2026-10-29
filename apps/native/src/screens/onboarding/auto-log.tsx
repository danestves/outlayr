import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";

import { AutoLogSourceRow } from "@/components/auto-log-source-row";
import { FirstRun } from "@/components/first-run";
import { MonoLabel } from "@/components/mono-label";
import { useDatabase } from "@/contexts/local-data-context";
import { useAutoLogSources } from "@/hooks/use-auto-log-sources";
import { useTranslation } from "@/i18n/context";

export function OnboardingAutoLog() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const sources = useAutoLogSources(db);
    const on = sources.filter((source) => source.on).length;

    return (
        <FirstRun
            action={{ label: t("common.continue"), onPress: () => router.push("/onboarding/smart-features") }}
            eyebrow={t("onboarding.autoLog.eyebrow")}
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
