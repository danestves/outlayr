import { use, useState } from "react";
import { useWindowDimensions, View } from "react-native";

import { AmountsHiddenContext, fittedHeroSize, FlowAmount } from "@/components/amount-text";
import { HERO_TYPE } from "@/components/hero-type";
import { Text } from "@/components/text";
import { amountDigits, amountParts, withCurrencySymbol } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

const FONT_SIZE = 40 * HERO_TYPE.scale;

interface LogHeroNumberProps {
    code: string;
    magnitude: number;
    positive: boolean;
    showCents: boolean;
}

export function LogHeroNumber({ magnitude, code, positive, showCents }: LogHeroNumberProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const { fontScale } = useWindowDimensions();
    const largeText = useAccessibilityTextSize();
    const [width, setWidth] = useState(0);
    const parts = amountParts(magnitude, code, showCents, language);
    const digits = amountDigits(parts);
    const sign = positive ? "+" : "-";
    const figureSize = hidden ? FONT_SIZE : fittedHeroSize(FONT_SIZE, magnitude, parts.minorUnits, width, fontScale);
    // Multi-character symbols like "Bs.D" read as part of the figure at full size.
    const symbolSize = (largeText ? figureSize : FONT_SIZE) * (parts.symbol.length > 1 ? 0.44 : 0.6);

    return (
        <View
            accessibilityLabel={hidden ? t("log.amounts.hidden") : `${sign}${withCurrencySymbol(parts, digits)}`}
            accessible
            className="flex-row items-baseline gap-1"
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
            <Text
                className="text-muted font-sans"
                numberOfLines={1}
                style={{ fontSize: symbolSize, ...HERO_TYPE.face }}
            >
                {sign}
                {parts.symbol}
            </Text>
            <FlowAmount
                amount={magnitude}
                className="text-foreground font-sans tabular-nums"
                code={code}
                fontFamily={HERO_TYPE.face.fontFamily}
                showCents={showCents}
                size={figureSize}
            />
        </View>
    );
}
