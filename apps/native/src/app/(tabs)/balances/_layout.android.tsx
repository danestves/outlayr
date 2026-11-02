import { Stack } from "expo-router";

import { useTranslation } from "@/i18n/context";
import { useAppBarOptions } from "@/navigation/material-chrome";
import { TabPauseProvider } from "@/navigation/tab-pause-provider";

export default function BalancesLayout() {
    const t = useTranslation();
    const appBar = useAppBarOptions();
    return (
        <TabPauseProvider>
            <Stack screenOptions={appBar}>
                {/* First declared is the initial route: the tab lands on the list. */}
                <Stack.Screen name="index" options={{ title: t("balances.title") }} />
                {/* Declared before `[id]` so the static segments win the match. */}
                <Stack.Screen name="overall" />
                <Stack.Screen name="category/[categoryId]" />
                <Stack.Screen name="[id]" />
                <Stack.Screen name="goals/[id]" />
            </Stack>
        </TabPauseProvider>
    );
}
