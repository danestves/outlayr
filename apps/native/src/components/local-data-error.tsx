import { Pressable, View } from "react-native";

import { useLocalData } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";

import { Text } from "./text";

/** Replaces the navigator: with no usable database no screen can render, and the splash must not hang. */
export function LocalDataError() {
    const { error, status, retry } = useLocalData();
    const t = useTranslation();
    const retrying = status !== "error";

    return (
        <View className="bg-background flex-1 items-center justify-center px-8">
            <Text className="font-sans-semibold text-foreground text-title pb-2">
                {t("transaction.localData.title")}
            </Text>
            <Text className="text-muted text-subtitle pb-5 text-center">{t("transaction.localData.body")}</Text>

            <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: retrying }}
                className="bg-accent rounded-xl px-6 py-3 active:opacity-80 disabled:opacity-50"
                disabled={retrying}
                onPress={retry}
            >
                <Text className="font-sans-semibold text-accent-foreground text-body">
                    {t(retrying ? "transaction.localData.retrying" : "common.retry")}
                </Text>
            </Pressable>

            {error ? <Text className="text-label text-muted pt-6 text-center">{error.message}</Text> : null}
        </View>
    );
}
