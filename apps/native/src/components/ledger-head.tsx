import { use } from "react";
import { View } from "react-native";

import { useDisplaySettings } from "@/contexts/display-settings-context";
import { currencySymbol, formatAmount, symbolPrefix } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

import { AmountsHiddenContext, FlowAmount } from "./amount-text";
import { MonoLabel } from "./mono-label";
import { RowPressable } from "./row-pressable";
import { ROW_TYPE } from "./row-type";
import { cn } from "./tw";

export interface LedgerCell {
    accessibilityHint?: string;
    /** Only money actually coming in earns the income colour; a positive net is still just a net. */
    income: boolean;
    /** One short word, so every cell fits across the narrowest phone. */
    label: string;
    /** Unsigned: the sign comes from `positive`, so 40 out and 40 in match. */
    magnitude: number;
    onPress: () => void;
    positive: boolean;
}

interface LedgerHeadProps {
    cells: readonly LedgerCell[];
    code: string;
}

/** `cells` order must not depend on the promoted measure, or the pair reshuffles under the thumb. */
export function LedgerHead({ cells, code }: LedgerHeadProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const stacked = useAccessibilityTextSize();
    return (
        <View>
            <View className="bg-border h-px w-full" />
            <View className={stacked ? undefined : "flex-row"}>
                {cells.map((cell, index) => (
                    <View
                        className={stacked ? undefined : cn("flex-1 overflow-hidden", index > 0 && "pl-3.5")}
                        key={index}
                    >
                        {/* Absolute, so the rule spans the taller column rather than its own content. */}
                        {index > 0 ? (
                            <View
                                className={
                                    stacked ? "bg-border h-px w-full" : "bg-border absolute inset-y-0 left-0 w-px"
                                }
                            />
                        ) : null}
                        <RowPressable
                            accessibilityHint={cell.accessibilityHint ?? t("log.ledger.showFigure")}
                            accessibilityLabel={`${cell.label}, ${hidden ? t("log.amounts.hidden") : `${cell.positive ? "+" : "-"}${formatAmount(cell.magnitude, code, showCents, language)}`}`}
                            accessibilityRole="button"
                            className="gap-0.75 py-2.5"
                            onPress={cell.onPress}
                        >
                            <MonoLabel>{cell.label}</MonoLabel>
                            <FlowAmount
                                amount={cell.magnitude}
                                className={cn(
                                    ROW_TYPE.cell,
                                    "tabular-nums",
                                    cell.income ? "text-income" : "text-foreground"
                                )}
                                code={code}
                                prefix={`${cell.positive ? "+" : "-"}${symbolPrefix(currencySymbol(code))}`}
                                showCents={showCents}
                            />
                        </RowPressable>
                    </View>
                ))}
            </View>
        </View>
    );
}
