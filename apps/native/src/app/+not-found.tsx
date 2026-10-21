import { Link, Stack } from "expo-router";
import { View } from "react-native";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";

// Replaces expo-router's `Unmatched` screen, which links to the `/_sitemap` developer surface.
export default function NotFoundScreen() {
    const t = useTranslation();
    return (
        <>
            <Stack.Title>{t("notFound.navTitle")}</Stack.Title>
            <View className="bg-background flex-1 items-center justify-center px-8">
                <Text className="font-sans-semibold text-foreground text-title pb-2">{t("notFound.title")}</Text>
                <Text className="text-muted text-subtitle pb-6 text-center">{t("notFound.body")}</Text>
                <Link href="/">
                    <Text className="font-sans-semibold text-subtitle text-tint">{t("notFound.action")}</Text>
                </Link>
            </View>
        </>
    );
}
