import { Pressable, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { MONO_LABEL_CLASS, MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useLanguage, useTranslation } from "@/i18n/context";
import { openInAppBrowser } from "@/lib/app-handoff";
import { useAuthSession } from "@/lib/auth-session";
import { legalUrl } from "@/lib/legal-url";
import { useColors } from "@/theme/use-colors";

function LegalDot() {
    return <Text className="text-muted text-micro">·</Text>;
}

export function LegalRow({
    disabled,
    noCloud,
    onRestore,
    restoring,
}: {
    disabled: boolean;
    noCloud: boolean;
    onRestore: () => void;
    restoring: boolean;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const { accountId } = useAuthSession();
    return (
        <View className="items-center gap-2 px-5 pt-4">
            <View className="flex-row items-center justify-center gap-4">
                <Pressable accessibilityRole="button" disabled={disabled} onPress={onRestore} testID="paywall-restore">
                    {restoring ? (
                        <BusyText className={MONO_LABEL_CLASS} color={colors.foreground}>
                            {t("pro.legal.restoring")}
                        </BusyText>
                    ) : (
                        <MonoLabel>{t("pro.legal.restore")}</MonoLabel>
                    )}
                </Pressable>
                <LegalDot />
                <Pressable accessibilityRole="link" onPress={() => openInAppBrowser(legalUrl("terms", language))}>
                    <MonoLabel>{t("pro.legal.terms")}</MonoLabel>
                </Pressable>
                <LegalDot />
                <Pressable accessibilityRole="link" onPress={() => openInAppBrowser(legalUrl("privacy", language))}>
                    <MonoLabel>{t("pro.legal.privacy")}</MonoLabel>
                </Pressable>
            </View>
            {accountId === null && !noCloud ? (
                <Text className="text-micro text-muted text-center">{t("pro.legal.guest")}</Text>
            ) : null}
        </View>
    );
}
