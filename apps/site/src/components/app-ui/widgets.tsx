import type { CanvasProps } from "./canvas";
import type { DemoRow } from "./ledger";
import { BudgetWidget } from "./widget-budget";
import { InsightsWidget } from "./widget-insights";
import { LedgerWidget } from "./widget-ledger";
import { LogWidget } from "./widget-log";

type Rows = readonly DemoRow[];

const SMALL = {
    budget: (canvas: CanvasProps) => <BudgetWidget {...canvas} family="small" />,
    insights: (canvas: CanvasProps) => <InsightsWidget {...canvas} family="small" />,
    log: (canvas: CanvasProps, extra?: Rows) => <LogWidget {...canvas} extra={extra} />,
};

const MEDIUM = {
    budget: (canvas: CanvasProps) => <BudgetWidget {...canvas} family="medium" />,
    insights: (canvas: CanvasProps) => <InsightsWidget {...canvas} family="medium" />,
    ledger: (canvas: CanvasProps, extra?: Rows) => <LedgerWidget {...canvas} extra={extra} family="medium" />,
};

export type SmallWidgetKind = keyof typeof SMALL;

export type MediumWidgetKind = keyof typeof MEDIUM;

interface WidgetArgs extends CanvasProps {
    extra?: Rows;
}

export function SmallWidget({ extra, kind, ...canvas }: WidgetArgs & { kind: SmallWidgetKind }) {
    return SMALL[kind](canvas, extra);
}

export function MediumWidget({ extra, kind, ...canvas }: WidgetArgs & { kind: MediumWidgetKind }) {
    return MEDIUM[kind](canvas, extra);
}
