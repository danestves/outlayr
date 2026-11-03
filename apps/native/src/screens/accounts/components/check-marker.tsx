import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { RowPressable } from "@/components/row-pressable";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatTime } from "@/domain/dates";
import { formatAmount, maskedAmount } from "@/domain/money";
import type { TransferLogRow } from "@/domain/transfer-log-rows";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

interface CheckMarkerProps {
    move: TransferLogRow;
    onPress: (id: string) => void;
}

export function CheckMarker({ move, onPress }: CheckMarkerProps) {
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents, use24Hour } = useDisplaySettings().state;
    const hidden = use(AmountsHiddenContext);
    const figure = hidden ? maskedAmount(move.currency) : formatAmount(move.amount, move.currency, showCents, language);
    const label = t("accounts.check.marker", {
        amount: `${move.sign ?? ""}${figure}`,
        time: formatTime(move.date, use24Hour, language),
    });

    return (
        <RowPressable
            accessibilityLabel={label}
            accessibilityRole="button"
            className="flex-row items-center gap-2 py-3"
            onPress={() => onPress(move.id)}
        >
            <HugeiconsIcon color={colors.income} icon={Tick02Icon} size={16} />
            <Text className="text-footnote text-muted shrink" numberOfLines={1}>
                {label}
            </Text>
            <View className="bg-border h-px flex-1" />
        </RowPressable>
    );
}
