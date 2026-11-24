import { Stack } from "expo-router";

import { useAppBarOptions } from "@/navigation/material-chrome";
import { TabPauseProvider } from "@/navigation/tab-pause-provider";

export default function LogLayout() {
    const appBar = useAppBarOptions();
    return (
        <TabPauseProvider>
            <Stack screenOptions={appBar}>
                <Stack.Screen name="index" options={{ title: "" }} />
            </Stack>
        </TabPauseProvider>
    );
}
