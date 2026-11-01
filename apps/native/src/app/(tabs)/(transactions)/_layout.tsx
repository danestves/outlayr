import { Stack } from "expo-router";

import { useTranslation } from "@/i18n/context";
import { TabPauseProvider } from "@/navigation/tab-pause-provider";

export default function LogLayout() {
    const t = useTranslation();
    return (
        <TabPauseProvider>
            <Stack>
                <Stack.Screen name="index">
                    <Stack.Header transparent />
                    <Stack.Screen.Title>{t("log.title")}</Stack.Screen.Title>
                </Stack.Screen>
            </Stack>
        </TabPauseProvider>
    );
}
