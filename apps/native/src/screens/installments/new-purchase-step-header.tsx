import ArrowLeft01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowLeft01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { GlassButton } from "@/components/glass-button";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const BACK_GLYPH = 19;

export function StepHeader({ onBack, title }: { onBack?: () => void; title: string }) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <View className="h-[46px] flex-row items-center">
            {onBack === undefined ? null : (
                <GlassButton
                    accessibilityLabel={t("common.back")}
                    className="h-[38px] w-[38px] rounded-full"
                    onPress={onBack}
                >
                    <HugeiconsIcon color={colors.foreground} icon={ArrowLeft01Icon} size={BACK_GLYPH} />
                </GlassButton>
            )}
            <View className="absolute right-0 left-0 items-center" pointerEvents="none">
                <Text accessibilityRole="header" className="text-callout text-foreground font-sans-semibold">
                    {title}
                </Text>
            </View>
        </View>
    );
}
