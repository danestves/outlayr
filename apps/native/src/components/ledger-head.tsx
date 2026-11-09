import { use, useState } from "react";
import { View } from "react-native";

import { useDisplaySettings } from "@/contexts/display-settings-context";
import { currencySymbol, formatAmount, maskedAmount, symbolPrefix } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

import { AmountsHiddenContext, FlowAmount } from "./amount-text";
import { MonoLabel } from "./mono-label";
import { RowPressable } from "./row-pressable";
import { ROW_TYPE } from "./row-type";
import { Text } from "./text";
import { cn } from "./tw";

export interface LedgerCell {
    accessibilityHint?: string;
    /** Only money actually coming in earns the income colour; a positive net is still just a net. */
    income: boolean;
    /** One short word, so every cell fits across the narrowest phone. */
    label: string;
    /** Unsigned: the sign comes from `positive`, so 40 out and 40 in match. */
    magnitude: number;
    onPress?: () => void;
    positive: boolean;
    /** Marks the cell and quiets the others. */
    selected?: boolean;
}

const CELL_FONT_SIZE = 16;
const CELL_FONT_FLOOR = 11;
/** `pl-3.5`, which every cell but the first gives up. */
const CELL_INSET = 14;
const NUMBER_FLOW_SLACK = 1.04;

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
    const [width, setWidth] = useState(0);
    const [widestFigure, setWidestFigure] = useState(0);
    const anySelected = cells.some((cell) => cell.selected);
    const cellWidth = stacked ? width : width / cells.length - CELL_INSET;
    // One size for the row: a NumberFlow cannot shrink itself, and clipping a figure would misstate it.
    const size =
        width > 0 && widestFigure > 0
            ? Math.max(
                  CELL_FONT_FLOOR,
                  Math.min(
                      CELL_FONT_SIZE,
                      Math.floor((CELL_FONT_SIZE * cellWidth) / (widestFigure * NUMBER_FLOW_SLACK))
                  )
              )
            : CELL_FONT_SIZE;
    const signedAmount = (cell: LedgerCell) =>
        `${cell.positive ? "+" : "-"}${formatAmount(cell.magnitude, code, showCents, language)}`;
    const spokenCell = (cell: LedgerCell) => `${cell.label}, ${hidden ? t("log.amounts.hidden") : signedAmount(cell)}`;
    const drawnFigures = cells
        .map((cell) => (hidden ? `${cell.positive ? "+" : "-"}${maskedAmount(code)}` : signedAmount(cell)))
        .join("\n");
    return (
        <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
            <View
                accessibilityElementsHidden
                className="absolute top-0 left-0 w-[9999px] opacity-0"
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
            >
                <Text
                    className={cn(ROW_TYPE.cell, "self-start tabular-nums")}
                    onLayout={({ nativeEvent }) => setWidestFigure(nativeEvent.layout.width)}
                    style={{ fontSize: CELL_FONT_SIZE }}
                >
                    {drawnFigures}
                </Text>
            </View>
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
                        {cell.selected ? <View className="bg-foreground absolute inset-x-0 top-0 h-0.5" /> : null}
                        {cell.onPress ? (
                            <RowPressable
                                accessibilityHint={cell.accessibilityHint ?? t("log.ledger.showFigure")}
                                accessibilityLabel={spokenCell(cell)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: cell.selected === true }}
                                className="gap-0.75 py-2.5"
                                onPress={cell.onPress}
                            >
                                <LedgerFigure
                                    cell={cell}
                                    code={code}
                                    quiet={anySelected && !cell.selected}
                                    showCents={showCents}
                                    size={size}
                                />
                            </RowPressable>
                        ) : (
                            <View accessibilityLabel={spokenCell(cell)} accessible className="gap-0.75 py-2.5">
                                <LedgerFigure
                                    cell={cell}
                                    code={code}
                                    quiet={anySelected && !cell.selected}
                                    showCents={showCents}
                                    size={size}
                                />
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}

interface LedgerFigureProps {
    cell: LedgerCell;
    code: string;
    quiet: boolean;
    showCents: boolean;
    size: number;
}

function figureTone(cell: LedgerCell, quiet: boolean) {
    if (quiet) {
        return "text-muted";
    }
    return cell.income ? "text-income" : "text-foreground";
}

function LedgerFigure({ cell, code, quiet, showCents, size }: LedgerFigureProps) {
    return (
        <>
            <MonoLabel className={cell.selected ? "text-foreground" : undefined}>{cell.label}</MonoLabel>
            <FlowAmount
                amount={cell.magnitude}
                className={cn(ROW_TYPE.cell, "tabular-nums", figureTone(cell, quiet))}
                code={code}
                prefix={`${cell.positive ? "+" : "-"}${symbolPrefix(currencySymbol(code))}`}
                showCents={showCents}
                size={size}
            />
        </>
    );
}
