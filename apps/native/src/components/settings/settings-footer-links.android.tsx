import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { SettingsFooterLinksProps } from "./settings-footer-links";

export type { SettingsFooterLinksProps } from "./settings-footer-links";

export function SettingsFooterLinks({ onCredits, onPrivacy, onTerms, version }: SettingsFooterLinksProps) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const links = [
        { label: t("pro.legal.privacy"), onPress: onPrivacy },
        { label: t("pro.legal.terms"), onPress: onTerms },
        { label: t("settings.controls.credits"), onPress: onCredits },
    ];
    return (
        <View className="items-center pt-8">
            <View className="flex-row flex-wrap items-center justify-center">
                {links.map((link) => (
                    <Pressable
                        accessibilityRole="link"
                        android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
                        className="min-h-12 justify-center px-3"
                        key={link.label}
                        onPress={link.onPress}
                    >
                        <Text className="text-body text-m3-on-surface">{link.label}</Text>
                    </Pressable>
                ))}
            </View>
            <Text className="text-caption text-m3-on-surface-variant pt-1 font-mono tabular-nums">{version}</Text>
        </View>
    );
}
