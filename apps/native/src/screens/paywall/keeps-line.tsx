import Tick02Icon from "@hugeicons-pro/core-solid-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export function KeepsLine() {
    const t = useTranslation();
    const colors = useColors();
    return (
        <View className="flex-row items-center justify-center gap-2 pb-3">
            <HugeiconsIcon color={colors.income} icon={Tick02Icon} size={16} />
            <Text className="text-foreground text-body shrink">{t("pro.band.keeps")}</Text>
        </View>
    );
}
