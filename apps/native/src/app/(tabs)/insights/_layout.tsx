import { Stack } from "expo-router";

import { useTranslation } from "@/i18n/context";
import { TabPauseProvider } from "@/navigation/tab-pause-provider";

export default function InsightsLayout() {
    const t = useTranslation();
    return (
        <TabPauseProvider>
            <Stack>
                <Stack.Screen name="index">
                    <Stack.Header transparent />
                    <Stack.Screen.Title large>{t("insights.title")}</Stack.Screen.Title>
                </Stack.Screen>
                <Stack.Screen name="breakdown">
                    <Stack.Header transparent />
                    <Stack.Screen.Title large>{t("insights.breakdown.title")}</Stack.Screen.Title>
                    <Stack.Screen.BackButton displayMode="minimal" />
                </Stack.Screen>
                <Stack.Screen name="cash-flow">
                    <Stack.Header transparent />
                    <Stack.Screen.BackButton displayMode="minimal" />
                </Stack.Screen>
                <Stack.Screen name="plan/[month]">
                    <Stack.Header transparent />
                    <Stack.Screen.BackButton displayMode="minimal" />
                </Stack.Screen>
            </Stack>
        </TabPauseProvider>
    );
}
