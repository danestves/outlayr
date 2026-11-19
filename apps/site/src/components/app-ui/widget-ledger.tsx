import { getIntlayer } from "intlayer";

import { AppFragment, useLedger, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { savedRows } from "./entry-state";
import { DEMO_NOW } from "./ledger";
import { interpolate } from "./strings";
import { measuredLength, textLineHeight } from "./type";
import {
    Dot,
    Eyebrow,
    FixedSpace,
    Hairline,
    primaryColor,
    Rounded,
    Spacer,
    WIDGET_SIZE,
    WidgetSurface,
} from "./widget-parts";
import type { WidgetPlacement } from "./widget-parts";
import { ledgerWidgetProps } from "./widget-props";
import type { LedgerEntryProps, LedgerWidgetProps } from "./widget-props";

export type LedgerFamily = "medium" | "large";

const ROW_LIMIT = { large: 8, medium: 3 } as const satisfies Record<LedgerFamily, number>;

const ROW_HEIGHT = measuredLength(textLineHeight(14));

const signed = (entry: LedgerEntryProps) => (entry.income ? `+${entry.amount}` : entry.amount);

interface LedgerViewArgs {
    at?: WidgetPlacement;
    family: LedgerFamily;
    widget: LedgerWidgetProps;
}

export function LedgerWidgetView({ at, family, widget }: LedgerViewArgs) {
    const { theme } = useReplica();
    const palette = widget.chrome[theme];
    const header = widget.headers.today.spent;
    return (
        <WidgetSurface at={at} background={palette.background} family={family}>
            <div style={{ flexDirection: "row", gap: 6 }}>
                <Eyebrow color={palette.muted} truncate>
                    {header.label}
                </Eyebrow>
                <div style={{ flex: "1 1 0" }} />
                <Eyebrow color={palette.muted}>{`${header.amount} ${header.positive ? "IN" : "OUT"}`}</Eyebrow>
            </div>
            <FixedSpace height={8} />
            <Hairline color={palette.border} />
            <FixedSpace height={8} />
            <div style={{ gap: 10 }}>
                {widget.entries.slice(0, ROW_LIMIT[family]).map((entry) => (
                    <div
                        key={entry.id}
                        style={{ alignItems: "center", flexDirection: "row", gap: 8, height: ROW_HEIGHT }}
                    >
                        <Dot color={entry.color === "" ? primaryColor(theme) : entry.color} size={7} />
                        <div style={{ flexShrink: 1, overflow: "hidden" }}>
                            <Rounded color={palette.ink} size={14} truncate weight={500}>
                                {entry.note}
                            </Rounded>
                        </div>
                        <div style={{ flex: "1 1 0", minWidth: 8 }} />
                        <Rounded color={entry.income ? palette.income : palette.ink} size={14} weight={600}>
                            {signed(entry)}
                        </Rounded>
                    </div>
                ))}
            </div>
            <Spacer />
        </WidgetSurface>
    );
}

export function ledgerWidgetLabel(
    widget: LedgerWidgetProps,
    family: LedgerFamily,
    locale: CanvasProps["locale"]
): string {
    return interpolate(getIntlayer("appUi", locale).labels.ledgerWidget, {
        entries: widget.entries
            .slice(0, ROW_LIMIT[family])
            .map((entry) => `${entry.note} ${signed(entry)}`)
            .join(", "),
        spent: widget.headers.today.spent.amount,
    });
}

interface LedgerWidgetFragmentProps extends CanvasProps {
    family?: LedgerFamily;
    now?: Date;
    widget?: LedgerWidgetProps;
    withSaved?: boolean;
}

export function LedgerWidget({
    family = "medium",
    now = DEMO_NOW,
    widget,
    withSaved = false,
    ...canvas
}: LedgerWidgetFragmentProps) {
    const ledger = useLedger();
    const props = widget ?? ledgerWidgetProps(ledger, now, canvas.locale, "stored", withSaved ? savedRows(ledger) : []);
    return (
        <AppFragment {...canvas} {...WIDGET_SIZE[family]} label={ledgerWidgetLabel(props, family, canvas.locale)}>
            <LedgerWidgetView family={family} widget={props} />
        </AppFragment>
    );
}
