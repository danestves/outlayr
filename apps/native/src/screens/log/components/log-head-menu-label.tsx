import ArrowDown01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { Text } from "@/components/text";
import { useColors } from "@/theme/use-colors";

export function LogHeadMenuLabel({ label }: { label: string }) {
    const colors = useColors();
    return (
        <View className="flex-row items-center gap-1 py-2.5">
            <Text className="text-muted text-caption font-sans" numberOfLines={1}>
                {label}
            </Text>
            <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={14} strokeWidth={2} />
        </View>
    );
}
