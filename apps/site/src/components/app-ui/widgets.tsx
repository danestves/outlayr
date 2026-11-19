import type { CanvasProps } from "./canvas";
import { BudgetWidget } from "./widget-budget";
import { InsightsWidget } from "./widget-insights";
import { LedgerWidget } from "./widget-ledger";
import { LogWidget } from "./widget-log";

const SMALL = {
    budget: (canvas: CanvasProps) => <BudgetWidget {...canvas} family="small" />,
    insights: (canvas: CanvasProps) => <InsightsWidget {...canvas} family="small" />,
    log: (canvas: CanvasProps, withSaved?: boolean) => <LogWidget {...canvas} withSaved={withSaved} />,
};

const MEDIUM = {
    budget: (canvas: CanvasProps) => <BudgetWidget {...canvas} family="medium" />,
    insights: (canvas: CanvasProps) => <InsightsWidget {...canvas} family="medium" />,
    ledger: (canvas: CanvasProps, withSaved?: boolean) => (
        <LedgerWidget {...canvas} family="medium" withSaved={withSaved} />
    ),
};

export type SmallWidgetKind = keyof typeof SMALL;

export type MediumWidgetKind = keyof typeof MEDIUM;

interface WidgetArgs extends CanvasProps {
    withSaved?: boolean;
}

export function SmallWidget({ kind, withSaved, ...canvas }: WidgetArgs & { kind: SmallWidgetKind }) {
    return SMALL[kind](canvas, withSaved);
}

export function MediumWidget({ kind, withSaved, ...canvas }: WidgetArgs & { kind: MediumWidgetKind }) {
    return MEDIUM[kind](canvas, withSaved);
}
