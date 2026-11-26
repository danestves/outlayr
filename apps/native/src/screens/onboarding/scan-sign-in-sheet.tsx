import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { Pressable, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { ProviderSignInButtons } from "@/components/account/provider-sign-in-buttons";
import { Text } from "@/components/text";
import { useSheetInsets } from "@/components/use-sheet-insets";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { holdScanForSignIn, useScanSignIn } from "./scan-sign-in";
import type { AuthClient } from "./scan-sign-in";

export function ScanSignInSheet({
    client,
    onOpenChange,
    onType,
    open,
}: {
    client: AuthClient;
    onOpenChange: (open: boolean) => void;
    onType: () => void;
    open: boolean;
}) {
    const t = useTranslation();
    const colors = useColors();
    const sheetInsets = useSheetInsets();
    const { restoring, signIn } = useScanSignIn(client);
    const start: typeof signIn.start = (request) => {
        holdScanForSignIn(true);
        signIn.start(request);
    };

    return (
        <BottomSheet native nativeBackground={colors.background} onOpenChange={onOpenChange} open={open}>
            <SafeAreaInsetsContext.Provider value={sheetInsets}>
                <BottomSheet.Content size="auto">
                    <View className="gap-1">
                        <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                            {t("onboarding.scan.signInTitle")}
                        </Text>
                        <Text className="text-muted text-subtitle leading-snug">{t("onboarding.scan.signInBody")}</Text>
                    </View>
                    <View className="android:pb-safe gap-3 pt-5">
                        <ProviderSignInButtons busy={signIn.busy} disabled={restoring} start={start} />
                        {signIn.error === null ? null : (
                            <Text
                                accessibilityLiveRegion="polite"
                                className="text-danger text-subtitle leading-snug"
                                role="alert"
                            >
                                {signIn.error}
                            </Text>
                        )}
                        <Pressable accessibilityRole="button" className="active:opacity-60" onPress={onType}>
                            <Text className="font-sans-medium text-muted text-subtitle pt-1 text-center">
                                {t("onboarding.firstLine.type")}
                            </Text>
                        </Pressable>
                    </View>
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}
