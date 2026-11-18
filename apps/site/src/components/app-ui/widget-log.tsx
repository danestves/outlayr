import { getIntlayer } from "intlayer";

import { AppFragment, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { DEMO_NOW } from "./ledger";
import type { DemoRow } from "./ledger";
import { interpolate } from "./strings";
import {
    contentWidth,
    Eyebrow,
    FixedSpace,
    Hairline,
    HeroLine,
    Spacer,
    WIDGET_SIZE,
    WidgetSurface,
} from "./widget-parts";
import type { WidgetPlacement } from "./widget-parts";
import { logWidgetProps } from "./widget-props";
import type { LogWidgetProps } from "./widget-props";

const PLUS = 28;

export function LogWidgetView({ at, widget }: { at?: WidgetPlacement; widget: LogWidgetProps }) {
    const { theme } = useReplica();
    const palette = widget.chrome[theme];
    return (
        <WidgetSurface at={at} background={palette.background} family="small">
            <Eyebrow color={palette.muted}>{widget.todayLabel}</Eyebrow>
            <FixedSpace height={6} />
            <HeroLine
                available={contentWidth("small")}
                caption="OUT"
                color={palette.ink}
                palette={palette}
                size={26}
                value={widget.todaySpent}
            />
            <Spacer />
            <Hairline color={palette.border} />
            <FixedSpace height={10} />
            <div style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
                <div
                    style={{
                        alignItems: "center",
                        background: palette.ink,
                        borderRadius: PLUS / 2,
                        height: PLUS,
                        justifyContent: "center",
                        width: PLUS,
                    }}
                >
                    <svg aria-hidden height={34 / 3} viewBox="0 0 34 34" width={34 / 3}>
                        <path
                            d="M17 2.85V31.15M2.85 17H31.15"
                            stroke={palette.background}
                            strokeLinecap="round"
                            strokeWidth={5.7}
                        />
                    </svg>
                </div>
                <Eyebrow color={palette.muted}>LOG EXPENSE</Eyebrow>
            </div>
        </WidgetSurface>
    );
}

export function logWidgetLabel(widget: LogWidgetProps, locale: CanvasProps["locale"]): string {
    return interpolate(getIntlayer("appUi", locale).labels.logWidget, { spent: widget.todaySpent });
}

interface LogWidgetFragmentProps extends CanvasProps {
    extra?: readonly DemoRow[];
    now?: Date;
    widget?: LogWidgetProps;
}

export function LogWidget({ extra, now = DEMO_NOW, widget, ...canvas }: LogWidgetFragmentProps) {
    const props = widget ?? logWidgetProps(now, canvas.locale, extra);
    return (
        <AppFragment {...canvas} {...WIDGET_SIZE.small} label={logWidgetLabel(props, canvas.locale)}>
            <LogWidgetView widget={props} />
        </AppFragment>
    );
}
