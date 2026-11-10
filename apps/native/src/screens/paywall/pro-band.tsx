import FlashIcon from "@hugeicons-pro/core-solid-rounded/FlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export function ProBand({
    eyebrow = true,
    lead,
    stats,
    subtitle,
    title,
}: {
    eyebrow?: boolean;
    lead?: ReactNode;
    stats?: string | null;
    subtitle: string;
    title: string;
}) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <View className="bg-pro gap-2 px-5 pt-2 pb-5">
            {eyebrow ? (
                <View className="flex-row items-center gap-2">
                    <View className="bg-pro-foreground size-6 items-center justify-center rounded-full">
                        <HugeiconsIcon color={colors.pro} icon={FlashIcon} size={13} />
                    </View>
                    <MonoLabel className="text-pro-foreground">{t("pro.entry.title")}</MonoLabel>
                </View>
            ) : null}
            <Text
                accessibilityRole="header"
                className="text-pro-foreground font-sans-bold text-[34px] leading-[38px] tracking-tight"
            >
                {title}
            </Text>
            <View className="flex-row items-center gap-1.5">
                {lead}
                <Text className="text-pro-foreground text-subtitle font-sans-semibold flex-1">{subtitle}</Text>
            </View>
            {stats ? <MonoLabel className="text-pro-muted">{stats}</MonoLabel> : null}
        </View>
    );
}
