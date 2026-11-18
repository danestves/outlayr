import type { CanvasProps } from "./canvas";
import { BudgetWidget } from "./widget-budget";
import { InsightsWidget } from "./widget-insights";
import { LedgerWidget } from "./widget-ledger";
import { LogWidget } from "./widget-log";

const SMALL = {
    budget: (canvas: CanvasProps) => <BudgetWidget {...canvas} family="small" />,
    insights: (canvas: CanvasProps) => <InsightsWidget {...canvas} family="small" />,
    log: (canvas: CanvasProps) => <LogWidget {...canvas} />,
};

const MEDIUM = {
    budget: (canvas: CanvasProps) => <BudgetWidget {...canvas} family="medium" />,
    insights: (canvas: CanvasProps) => <InsightsWidget {...canvas} family="medium" />,
    ledger: (canvas: CanvasProps) => <LedgerWidget {...canvas} family="medium" />,
};

export type SmallWidgetKind = keyof typeof SMALL;

export type MediumWidgetKind = keyof typeof MEDIUM;

export function SmallWidget({ kind, ...canvas }: CanvasProps & { kind: SmallWidgetKind }) {
    const Widget = SMALL[kind];
    return <Widget {...canvas} />;
}

export function MediumWidget({ kind, ...canvas }: CanvasProps & { kind: MediumWidgetKind }) {
    const Widget = MEDIUM[kind];
    return <Widget {...canvas} />;
}
