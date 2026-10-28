import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";

export interface SettingsFooterLinksProps {
    onCredits: () => void;
    onPrivacy: () => void;
    onTerms: () => void;
    version: string;
}

export function SettingsFooterLinks({ onCredits, onPrivacy, onTerms, version }: SettingsFooterLinksProps) {
    const t = useTranslation();
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
                        className="min-h-11 justify-center px-3 active:opacity-60"
                        key={link.label}
                        onPress={link.onPress}
                    >
                        <Text className="text-subtitle text-foreground">{link.label}</Text>
                    </Pressable>
                ))}
            </View>
            <Text className="text-eyebrow text-muted pt-1 font-mono tabular-nums">{version}</Text>
        </View>
    );
}
