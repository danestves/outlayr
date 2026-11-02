import { Stack } from "expo-router";

import { useTranslation } from "@/i18n/context";
import { useAppBarOptions } from "@/navigation/material-chrome";
import { TabPauseProvider } from "@/navigation/tab-pause-provider";

export default function InsightsLayout() {
    const t = useTranslation();
    const appBar = useAppBarOptions();
    return (
        <TabPauseProvider>
            <Stack screenOptions={appBar}>
                <Stack.Screen name="index" options={{ title: t("insights.title") }} />
                <Stack.Screen name="breakdown" options={{ title: t("insights.breakdown.title") }} />
                <Stack.Screen name="cash-flow" />
                <Stack.Screen name="plan/[month]" />
            </Stack>
        </TabPauseProvider>
    );
}
