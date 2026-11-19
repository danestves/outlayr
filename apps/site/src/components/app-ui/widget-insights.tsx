import { getIntlayer } from "intlayer";

import type { WidgetPalette } from "../../../../native/src/widgets/palette";
import { WIDGET_PALETTE } from "../../../../native/src/widgets/palette";
import { AppFragment, useLedger, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { DEMO_NOW } from "./ledger";
import { interpolate } from "./strings";
import {
    Cell,
    Cells,
    contentWidth,
    Dot,
    Eyebrow,
    FixedSpace,
    Hairline,
    HeroLine,
    Rounded,
    Spacer,
    WIDGET_SIZE,
    WidgetSurface,
} from "./widget-parts";
import type { WidgetPlacement } from "./widget-parts";
import { insightsView } from "./widget-props";
import type { InsightsPeriod, InsightsViewProps } from "./widget-props";

export type InsightsFamily = "small" | "medium";

const COLUMN_GAP = 14;
const LABELLED_BARS = 7;

interface BarsProps {
    height: number;
    labels: boolean;
    palette: WidgetPalette;
    view: InsightsViewProps;
}

function Bars({ height, labels, palette, view }: BarsProps) {
    const peak = Math.max(0, ...view.bars.map((bar) => bar.y));
    return (
        <div style={{ gap: 4 }}>
            <div style={{ alignItems: "flex-end", flexDirection: "row", gap: 3, height }}>
                {view.bars.map((bar, index) => (
                    <div
                        key={index}
                        style={{
                            background: bar.y > 0 ? palette.ink : palette.border,
                            flex: "1 1 0",
                            height: peak > 0 ? Math.max(1, (bar.y / peak) * height) : 1,
                        }}
                    />
                ))}
            </div>
            {labels && view.bars.length <= LABELLED_BARS ? (
                <div style={{ flexDirection: "row", gap: 3 }}>
                    {view.bars.map((bar, index) => (
                        <div key={index} style={{ alignItems: "center", flex: "1 1 0" }}>
                            <Eyebrow color={palette.muted} size={8}>
                                {bar.x}
                            </Eyebrow>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

interface HeroProps {
    available: number;
    palette: WidgetPalette;
    size: number;
    view: InsightsViewProps;
}

function Hero({ available, palette, size, view }: HeroProps) {
    return (
        <div style={{ gap: 1 }}>
            <Eyebrow color={palette.muted}>{view.periodLabel}</Eyebrow>
            <HeroLine
                available={available}
                caption="NET"
                color={view.netPositive ? palette.income : palette.ink}
                palette={palette}
                size={size}
                value={view.netPositive ? view.net : `−${view.net}`}
            />
        </div>
    );
}

interface InsightsViewArgs {
    at?: WidgetPlacement;
    family: InsightsFamily;
    view: InsightsViewProps;
}

export function InsightsWidgetView({ at, family, view }: InsightsViewArgs) {
    const { theme } = useReplica();
    const palette = WIDGET_PALETTE[theme];
    if (family === "small") {
        return (
            <WidgetSurface at={at} background={palette.background} family="small">
                <Hero available={contentWidth("small")} palette={palette} size={26} view={view} />
                <Spacer />
                <Bars height={44} labels palette={palette} view={view} />
            </WidgetSurface>
        );
    }
    const column = (contentWidth("medium") - COLUMN_GAP) / 2;
    return (
        <WidgetSurface at={at} background={palette.background} family="medium" row>
            <div style={{ flex: "1 1 0" }}>
                <Hero available={column} palette={palette} size={32} view={view} />
                <Spacer grows={false} />
                <Hairline color={palette.border} />
                <FixedSpace height={8} />
                <Cells>
                    <Cell label="SPENT" leading palette={palette} value={view.spent} width={column / 2} />
                    <Cell label="IN" leading={false} palette={palette} value={view.income} width={column / 2} />
                </Cells>
            </div>
            <div style={{ alignSelf: "center", flex: "1 1 0", gap: 8 }}>
                <Bars height={34} labels={false} palette={palette} view={view} />
                <div style={{ gap: 5 }}>
                    {view.slices.slice(0, 3).map((slice) => (
                        <div key={slice.name} style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
                            <Dot color={slice.color} size={6} />
                            <Rounded color={palette.ink} size={11} truncate weight={500}>
                                {slice.name}
                            </Rounded>
                            <div style={{ flex: "1 1 0" }} />
                            <Eyebrow color={palette.muted}>{`${Math.round(slice.fraction * 100)}%`}</Eyebrow>
                        </div>
                    ))}
                </div>
            </div>
        </WidgetSurface>
    );
}

export function insightsWidgetLabel(view: InsightsViewProps, locale: CanvasProps["locale"]): string {
    return interpolate(getIntlayer("appUi", locale).labels.insightsWidget, {
        income: view.income,
        net: view.netPositive ? view.net : `−${view.net}`,
        range: view.rangeLabel,
        spent: view.spent,
    });
}

interface InsightsWidgetProps extends CanvasProps {
    family?: InsightsFamily;
    now?: Date;
    period?: InsightsPeriod;
    view?: InsightsViewProps;
}

export function InsightsWidget({
    family = "small",
    now = DEMO_NOW,
    period = "week",
    view,
    ...canvas
}: InsightsWidgetProps) {
    const ledger = useLedger();
    const props = view ?? insightsView(ledger, period, now, canvas.locale);
    return (
        <AppFragment {...canvas} {...WIDGET_SIZE[family]} label={insightsWidgetLabel(props, canvas.locale)}>
            <InsightsWidgetView family={family} view={props} />
        </AppFragment>
    );
}
