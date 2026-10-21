import { use } from "react";
import { Pressable, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { Text } from "@/components/text";
import type { PayoffLine } from "@/data/payoff-plans";
import { useNow } from "@/data/use-now";
import { useLanguage, useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { payoffFacts } from "./debts-wording";

const TICK_OVERHANG = 4;

/** The tick is where the date wants the fill today. */
export function PayoffBar({ height = 3, line }: { height?: number; line: Pick<PayoffLine, "fraction" | "tick"> }) {
    const colors = useColors();
    return (
        <View style={{ paddingVertical: TICK_OVERHANG }}>
            <View
                className="rounded-full"
                style={{ backgroundColor: withAlpha(colors.foreground, 0.14), height, overflow: "visible" }}
            >
                <View
                    className="bg-foreground absolute top-0 bottom-0 left-0 rounded-full"
                    style={{ width: `${(line.fraction ?? 0) * 100}%` }}
                />
                {line.tick === null ? null : (
                    <View
                        className="bg-tint absolute"
                        style={{
                            height: height + TICK_OVERHANG * 2,
                            left: `${line.tick * 100}%`,
                            top: -TICK_OVERHANG,
                            width: 2,
                        }}
                    />
                )}
            </View>
        </View>
    );
}

export function PayoffSummary({
    currency,
    line,
    onPress,
}: {
    currency: string;
    line: PayoffLine;
    onPress: () => void;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const { behind, plan } = payoffFacts(line, currency, hidden, useNow(), { language, t });

    return (
        <Pressable
            accessibilityHint={t("debts.plan.change")}
            accessibilityLabel={[plan, behind].filter(Boolean).join(", ")}
            accessibilityRole="button"
            className="w-full pt-3 active:opacity-70"
            onPress={onPress}
        >
            <PayoffBar height={4} line={line} />
            <View className="flex-row justify-between gap-3 pt-1">
                <Text className="text-subtitle text-muted tabular-nums">{plan}</Text>
                {behind === null ? null : <Text className="text-subtitle text-over-budget tabular-nums">{behind}</Text>}
            </View>
        </Pressable>
    );
}
