import Archive02Icon from "@hugeicons-pro/core-solid-rounded/Archive02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useWindowDimensions, View } from "react-native";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

/** Window height, not a percentage: a list header has no definite parent. */
export function LogNoResults() {
    const colors = useColors();
    const t = useTranslation();
    const { height } = useWindowDimensions();
    return (
        <View className="items-center justify-center gap-3 opacity-70" style={{ height: height * 0.7 }}>
            <HugeiconsIcon color={colors.muted} icon={Archive02Icon} size={38} />
            <Text className="font-sans-medium text-muted text-title">{t("log.noResults")}</Text>
        </View>
    );
}
