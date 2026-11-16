import { use, useState } from "react";
import { useWindowDimensions, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { HERO_TYPE } from "@/components/hero-type";
import { amountHeroLength } from "@/domain/amount-hero-size";
import { amountDigits, amountParts, withCurrencySymbol } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

import { SplitAmount } from "./split-amount";

const FONT_SIZE = 44 * HERO_TYPE.scale;
const FONT_FLOOR = 24;
/** Mean advance of a bold grouped figure, in em; NumberFlow reports no width before layout. */
const BOLD_ADVANCE = 0.62;

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
    const [width, setWidth] = useState(0);
    const parts = amountParts(magnitude, code, showCents, language);
    const sign = positive ? "+" : "-";
    const characters = amountHeroLength(magnitude, parts.minorUnits) + 1 + parts.symbol.length;
    const size =
        hidden || width === 0
            ? FONT_SIZE
            : Math.max(FONT_FLOOR, Math.min(FONT_SIZE, Math.floor(width / (characters * BOLD_ADVANCE * fontScale))));

    return (
        <View
            accessibilityLabel={
                hidden ? t("log.amounts.hidden") : `${sign}${withCurrencySymbol(parts, amountDigits(parts))}`
            }
            accessible
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
            <SplitAmount
                code={code}
                fontFamily={HERO_TYPE.face.fontFamily}
                magnitude={magnitude}
                positive={positive}
                showCents={showCents}
                size={size}
                toneClass="text-foreground"
                typeClass="font-sans-bold"
            />
        </View>
    );
}
