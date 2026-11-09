import { use, useState } from "react";
import { useWindowDimensions, View } from "react-native";

import { useDisplaySettings } from "@/contexts/display-settings-context";
import { amountParts, currencySymbol, formatAmount, symbolPrefix } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

import { AmountsHiddenContext, fittedHeroSize, FlowAmount } from "./amount-text";
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
    onPress?: () => void;
    positive: boolean;
    /** Marks the cell and quiets the others. */
    selected?: boolean;
}

const CELL_FONT_SIZE = 16;
const CELL_FONT_FLOOR = 11;
/** `pl-3.5`, which every cell but the first gives up. */
const CELL_INSET = 14;

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
    const { fontScale } = useWindowDimensions();
    const [width, setWidth] = useState(0);
    const anySelected = cells.some((cell) => cell.selected);
    const cellWidth = stacked ? width : width / cells.length - CELL_INSET;
    // One size for the row: a NumberFlow cannot shrink itself, and clipping a figure would misstate it.
    const size = Math.min(
        ...cells.map(({ magnitude }) =>
            fittedHeroSize(
                CELL_FONT_SIZE,
                magnitude,
                amountParts(magnitude, code, showCents, language).minorUnits,
                cellWidth,
                fontScale,
                CELL_FONT_FLOOR
            )
        )
    );
    const spokenCell = (cell: LedgerCell) =>
        `${cell.label}, ${hidden ? t("log.amounts.hidden") : `${cell.positive ? "+" : "-"}${formatAmount(cell.magnitude, code, showCents, language)}`}`;
    return (
        <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
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
