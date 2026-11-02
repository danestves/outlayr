import { Stack } from "expo-router";

import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";
import { useAppBarOptions } from "@/navigation/material-chrome";
import { TabPauseProvider } from "@/navigation/tab-pause-provider";

export default function InsightsLayout() {
    const t = useTranslation();
    const year = new Date(useNow()).getFullYear();
    const appBar = useAppBarOptions();
    return (
        <TabPauseProvider>
            <Stack screenOptions={appBar}>
                <Stack.Screen name="index" options={{ title: t("insights.title") }} />
                <Stack.Screen name="breakdown" options={{ title: t("insights.breakdown.title") }} />
                <Stack.Screen name="cash-flow" />
                <Stack.Screen name="plan/index" options={{ title: t("budgets.plan.action.plan", { year }) }} />
                <Stack.Screen name="plan/[month]" />
            </Stack>
        </TabPauseProvider>
    );
}
