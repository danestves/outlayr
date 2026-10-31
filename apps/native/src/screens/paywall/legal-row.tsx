import { Pressable, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { MONO_LABEL_CLASS, MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useLanguage, useTranslation } from "@/i18n/context";
import { openInAppBrowser } from "@/lib/app-handoff";
import { legalUrl } from "@/lib/legal-url";
import { useColors } from "@/theme/use-colors";

function LegalDot() {
    return <Text className="text-muted text-micro">·</Text>;
}

/** Restore stays hidden until there is an account for it to restore into. */
export function LegalRow({
    canRestore,
    disabled,
    onRestore,
    restoring,
}: {
    canRestore: boolean;
    disabled: boolean;
    onRestore: () => void;
    restoring: boolean;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    return (
        <View className="flex-row items-center justify-center gap-4 px-5 pt-4">
            {canRestore ? (
                <>
                    <Pressable
                        accessibilityRole="button"
                        disabled={disabled}
                        onPress={onRestore}
                        testID="paywall-restore"
                    >
                        {restoring ? (
                            <BusyText className={MONO_LABEL_CLASS} color={colors.foreground}>
                                {t("pro.legal.restoring")}
                            </BusyText>
                        ) : (
                            <MonoLabel>{t("pro.legal.restore")}</MonoLabel>
                        )}
                    </Pressable>
                    <LegalDot />
                </>
            ) : null}
            <Pressable accessibilityRole="link" onPress={() => openInAppBrowser(legalUrl("terms", language))}>
                <MonoLabel>{t("pro.legal.terms")}</MonoLabel>
            </Pressable>
            <LegalDot />
            <Pressable accessibilityRole="link" onPress={() => openInAppBrowser(legalUrl("privacy", language))}>
                <MonoLabel>{t("pro.legal.privacy")}</MonoLabel>
            </Pressable>
        </View>
    );
}
