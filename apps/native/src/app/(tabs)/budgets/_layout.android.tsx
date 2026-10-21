import { Stack } from "expo-router";

import { useTranslation } from "@/i18n/context";
import { useAppBarOptions } from "@/navigation/material-chrome";
import { TabPauseProvider } from "@/navigation/tab-pause-provider";

export default function BudgetsLayout() {
    const t = useTranslation();
    const appBar = useAppBarOptions();
    return (
        <TabPauseProvider>
            <Stack screenOptions={appBar}>
                {/* First declared is the initial route: the tab lands on the list. */}
                <Stack.Screen name="index" options={{ title: t("budgets.title") }} />
                {/* Declared before `[id]` so the static segment wins the match. */}
                <Stack.Screen name="overall" />
                <Stack.Screen name="[id]" />
                <Stack.Screen name="goals/[id]" />
            </Stack>
        </TabPauseProvider>
    );
}
