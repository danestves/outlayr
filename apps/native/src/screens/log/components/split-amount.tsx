import { roundMoney } from "@outlayr/money/round";
import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext, FlowFigure } from "@/components/amount-text";
import { Text } from "@/components/text";
import { AMOUNT_MASK, amountParts, symbolPrefix } from "@/domain/money";
import { useLanguage } from "@/i18n/context";

interface SplitAmountProps {
    code: string;
    fontFamily?: string;
    magnitude: number;
    positive: boolean;
    showCents: boolean;
    size: number;
    toneClass: string;
    typeClass: string;
}

export function SplitAmount({
    code,
    fontFamily,
    magnitude,
    positive,
    showCents,
    size,
    toneClass,
    typeClass,
}: SplitAmountProps) {
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const parts = amountParts(magnitude, code, showCents, language);
    const style = fontFamily ? { fontFamily, fontSize: size } : { fontSize: size };

    if (hidden) {
        return (
            <Text className={`${typeClass} ${toneClass}`} numberOfLines={1} style={style}>
                {symbolPrefix(parts.symbol)}
                {AMOUNT_MASK}
            </Text>
        );
    }
    return (
        <View className="flex-row items-baseline">
            <FlowFigure
                className={`${typeClass} ${toneClass} tabular-nums`}
                fontFamily={fontFamily}
                format={{ maximumFractionDigits: 0, useGrouping: true }}
                locale={parts.locale}
                prefix={`${positive ? "+" : "-"}${symbolPrefix(parts.symbol)}`}
                size={size}
                value={Math.trunc(roundMoney(magnitude, parts.minorUnits))}
            />
            {parts.fraction ? (
                <Text className={`${typeClass} text-muted tabular-nums`} style={style}>
                    {parts.locale.decimal}
                    {parts.fraction}
                </Text>
            ) : null}
        </View>
    );
}
