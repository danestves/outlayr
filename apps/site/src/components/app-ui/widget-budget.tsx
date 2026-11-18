import { getIntlayer } from "intlayer";

import { WIDGET_PALETTE } from "../../../../native/src/widgets/palette";
import { AppFragment, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { DEMO_NOW } from "./ledger";
import { interpolate } from "./strings";
import {
    Cell,
    Cells,
    contentWidth,
    Eyebrow,
    FixedSpace,
    Hairline,
    HeroLine,
    Rail,
    Spacer,
    WIDGET_SIZE,
    WidgetSurface,
} from "./widget-parts";
import type { WidgetPlacement } from "./widget-parts";
import { overallBudgetView } from "./widget-props";
import type { BudgetViewProps } from "./widget-props";

export type BudgetFamily = "small" | "medium";

interface BudgetViewArgs {
    at?: WidgetPlacement;
    family: BudgetFamily;
    view: BudgetViewProps;
}

export function BudgetWidgetView({ at, family, view }: BudgetViewArgs) {
    const { theme } = useReplica();
    const palette = WIDGET_PALETTE[theme];
    const accent = view.over ? palette.over : palette.ink;
    const small = family === "small";
    const width = contentWidth(family);
    const cells = [
        { label: "SPENT", value: view.spent },
        { label: "LIMIT", value: view.limit },
        ...(small ? [] : [{ label: "ELAPSED", value: `${Math.round(view.elapsedFraction * 100)}%` }]),
    ];
    return (
        <WidgetSurface at={at} background={palette.background} family={family}>
            <Eyebrow color={palette.muted}>
                {small ? view.periodLabel : `${view.periodLabel} · ${view.rangeLabel}`}
            </Eyebrow>
            <FixedSpace height={6} />
            <HeroLine
                available={width}
                caption={view.remainingCaption}
                color={accent}
                palette={palette}
                size={small ? 26 : 32}
                value={view.remaining}
            />
            <FixedSpace height={10} />
            <Rail color={accent} fraction={view.spentFraction} />
            <Spacer grows={false} />
            <Hairline color={palette.border} />
            <FixedSpace height={8} />
            <Cells>
                {cells.map((cell, index) => (
                    <Cell
                        key={cell.label}
                        label={cell.label}
                        leading={index === 0}
                        palette={palette}
                        value={cell.value}
                        width={width / cells.length}
                    />
                ))}
            </Cells>
        </WidgetSurface>
    );
}

export function budgetWidgetLabel(view: BudgetViewProps, locale: CanvasProps["locale"]): string {
    return interpolate(getIntlayer("appUi", locale).labels.budgetWidget, {
        caption: view.remainingCaption.toLowerCase(),
        limit: view.limit,
        remaining: view.remaining,
        spent: view.spent,
    });
}

interface BudgetWidgetProps extends CanvasProps {
    family?: BudgetFamily;
    now?: Date;
    view?: BudgetViewProps;
}

export function BudgetWidget({ family = "small", now = DEMO_NOW, view, ...canvas }: BudgetWidgetProps) {
    const props = view ?? overallBudgetView(now, canvas.locale);
    return (
        <AppFragment {...canvas} {...WIDGET_SIZE[family]} label={budgetWidgetLabel(props, canvas.locale)}>
            <BudgetWidgetView family={family} view={props} />
        </AppFragment>
    );
}
