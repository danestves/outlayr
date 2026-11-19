import { getIntlayer } from "intlayer";
import type { ReactNode } from "react";

import { AppScreen, useLedger, useReplica } from "./canvas";
import type { AppTheme, CanvasProps } from "./canvas";
import { DEMO_NOW } from "./ledger";
import { BudgetWidget, BudgetWidgetView } from "./widget-budget";
import { InsightsWidget, InsightsWidgetView } from "./widget-insights";
import { LedgerWidget, LedgerWidgetView } from "./widget-ledger";
import { LogWidget, LogWidgetView } from "./widget-log";
import { insightsView, ledgerWidgetProps, logWidgetProps, overallBudgetView } from "./widget-props";

const GROUND = { dark: "#272840", light: "#a08c7e" } as const satisfies Record<AppTheme, string>;

const LEFT = 79 / 3;
const RIGHT = 634 / 3;
const FIRST = 270 / 3;
const SECOND = 872 / 3;
const THIRD = 1474 / 3;

function Ground() {
    const { theme } = useReplica();
    return <div className="absolute inset-0" style={{ background: GROUND[theme] }} />;
}

function HomeScreen({ children, ...canvas }: CanvasProps & { children: ReactNode }) {
    return (
        <AppScreen {...canvas} label={getIntlayer("appUi", canvas.locale).labels.homeWidgets}>
            <Ground />
            {children}
        </AppScreen>
    );
}

function SmallMediumCapture(canvas: CanvasProps) {
    const ledger = useLedger();
    return (
        <HomeScreen {...canvas}>
            <InsightsWidgetView
                at={{ x: LEFT, y: FIRST }}
                family="small"
                view={insightsView(ledger, "week", DEMO_NOW, canvas.locale)}
            />
            <BudgetWidgetView
                at={{ x: RIGHT, y: FIRST }}
                family="small"
                view={overallBudgetView(ledger, DEMO_NOW, canvas.locale)}
            />
            <LogWidgetView at={{ x: LEFT, y: SECOND }} widget={logWidgetProps(ledger, DEMO_NOW, canvas.locale)} />
            <BudgetWidgetView
                at={{ x: LEFT, y: THIRD }}
                family="medium"
                view={overallBudgetView(ledger, DEMO_NOW, canvas.locale)}
            />
        </HomeScreen>
    );
}

function InsightsMediumCapture(canvas: CanvasProps) {
    const ledger = useLedger();
    return (
        <HomeScreen {...canvas}>
            <InsightsWidgetView
                at={{ x: LEFT, y: FIRST }}
                family="medium"
                view={insightsView(ledger, "week", DEMO_NOW, canvas.locale)}
            />
        </HomeScreen>
    );
}

function EntriesCapture(canvas: CanvasProps) {
    const ledger = useLedger();
    const widget = ledgerWidgetProps(ledger, DEMO_NOW, canvas.locale, "unset");
    return (
        <HomeScreen {...canvas}>
            <LedgerWidgetView at={{ x: LEFT, y: FIRST }} family="medium" widget={widget} />
            <LedgerWidgetView at={{ x: LEFT, y: SECOND }} family="large" widget={widget} />
        </HomeScreen>
    );
}

export const screens = {
    "budget-medium": (canvas: CanvasProps) => <BudgetWidget {...canvas} family="medium" />,
    "budget-small": BudgetWidget,
    "home-widgets-entries": EntriesCapture,
    "home-widgets-insights-medium": InsightsMediumCapture,
    "home-widgets-small-medium": SmallMediumCapture,
    "insights-medium": (canvas: CanvasProps) => <InsightsWidget {...canvas} family="medium" />,
    "insights-small": InsightsWidget,
    "ledger-large": (canvas: CanvasProps) => <LedgerWidget {...canvas} family="large" />,
    "ledger-medium": LedgerWidget,
    "log-small": LogWidget,
};
