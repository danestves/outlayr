import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Kpi } from "panelui-web/kpi";
import type { KpiGoodDirection } from "panelui-web/kpi";
import type { ComponentProps, ReactNode } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import type { DashboardSearch } from "@/components/dashboard/shell/filters";

const PERCENT = 100;
const TENTHS = 10;

export const FIGURE = "dash-figure";
export const NOTE = "text-muted-foreground text-[13px] leading-5";
export const STATEMENT = "text-[15px] leading-5 font-semibold tracking-[-0.01em]";
export const GRID = "grid grid-cols-1 gap-4 lg:grid-cols-3";
export const ROW = "border-border flex h-[38px] items-center gap-2.5 border-t text-[13px] font-medium first:border-t-0";

interface CardProps extends Omit<ComponentProps<"section">, "title"> {
    action?: ReactNode;
    footer?: ReactNode;
    panelClassName?: string;
    /** A sentence that is the card's finding, set as a heading rather than a label. */
    statement?: ReactNode;
    title?: ReactNode;
}

/** A PanelUI frame: a labelled tray around one panel. Without a title or statement it is the panel alone. */
export function Card({
    action,
    children,
    className = "",
    footer,
    panelClassName = "",
    statement,
    title,
    ...props
}: CardProps) {
    const headed = title !== undefined || statement !== undefined;
    if (!headed) {
        return (
            <Frame className={`min-w-0 ${className}`} render={<section {...props} />} variant="plain">
                <Frame.Panel className={`flex-1 divide-y-0 ${panelClassName}`}>{children}</Frame.Panel>
            </Frame>
        );
    }
    return (
        <Frame className={`min-w-0 ${className}`} render={<section {...props} />}>
            <Frame.Header className={statement === undefined ? "" : "items-start pt-4"}>
                {statement === undefined ? (
                    <Frame.Title as="h2">{title}</Frame.Title>
                ) : (
                    <Frame.Title as="h2" className={`text-foreground ${STATEMENT}`}>
                        {statement}
                    </Frame.Title>
                )}
                {action ? (
                    <Frame.Action className={statement === undefined ? "row-span-1 self-center" : ""}>
                        {action}
                    </Frame.Action>
                ) : null}
            </Frame.Header>
            <Frame.Panel className={`flex-1 divide-y-0 ${panelClassName}`}>{children}</Frame.Panel>
            {footer ? <Frame.Footer>{footer}</Frame.Footer> : null}
        </Frame>
    );
}

/** Bones drawn by hand inside a measured skeleton: skullet paints this as written instead of measuring it. */
export function Bones({ className = "", ...props }: ComponentProps<"span">) {
    return <span className={`block ${className}`} skullet-own="" {...props} />;
}

/** The raised tray with nothing set into it, for a card whose content sits on the tray itself. */
export function Tray({ children, className = "", ...props }: ComponentProps<"section">) {
    return (
        <Frame className={`min-w-0 ${className}`} render={<section {...props} />}>
            {children}
        </Frame>
    );
}

export interface Figure {
    foot?: ReactNode;
    label: ReactNode;
    value: ReactNode;
}

/** The row of figures that opens a tab. */
export function KpiStrip({ figures }: { figures: readonly Figure[] }) {
    return (
        <Kpi.Group
            className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-5 max-lg:divide-x-0 max-lg:*:px-0 lg:grid lg:auto-cols-fr lg:grid-flow-col"
            surface
        >
            {figures.map((figure, index) => (
                <Kpi className="min-w-0 gap-0" key={index}>
                    <Kpi.Title>{figure.label}</Kpi.Title>
                    <Kpi.Value
                        className={`${FIGURE} mt-1 truncate text-2xl leading-8 font-semibold tracking-[-0.04em]`}
                    >
                        {figure.value}
                    </Kpi.Value>
                    <div className="mt-1 flex h-[22px] min-w-0 items-center gap-2">{figure.foot}</div>
                </Kpi>
            ))}
        </Kpi.Group>
    );
}

const signedPercent = (delta: number) => {
    const percent = Math.round(delta * PERCENT * TENTHS) / TENTHS;
    return `${percent > 0 ? "+" : ""}${percent}%`;
};

function toneOf(delta: number, goodDirection: KpiGoodDirection) {
    if (delta === 0 || goodDirection === "none") {
        return "flat";
    }
    return delta > 0 === (goodDirection === "up") ? "good" : "poor";
}

/** A change against another span as a signed percent, coloured by whether that direction is good. */
export function Change({ delta, goodDirection = "up" }: { delta: number | null; goodDirection?: KpiGoodDirection }) {
    if (delta === null) {
        return null;
    }
    return (
        <span className="dash-trend" data-tone={toneOf(delta, goodDirection)}>
            {signedPercent(delta)}
        </span>
    );
}

/** A plain figure in the same pill as a change, for a share that is neither good nor bad. */
export function Flat({ children }: { children: ReactNode }) {
    return (
        <span className="dash-trend" data-tone="flat">
            {children}
        </span>
    );
}

export function Note({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <span className={`${NOTE} min-w-0 truncate ${className}`}>{children}</span>;
}

export function Swatch({ color }: { color: string }) {
    return <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/** A filled share of a track. `value` and `max` are amounts; a track with no max is empty. */
export function Track({
    className = "",
    color,
    max,
    value,
}: {
    className?: string;
    color: string;
    max: number;
    value: number;
}) {
    const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    return (
        <span aria-hidden className={`block h-2 overflow-hidden rounded-full ${className}`}>
            <span className="block h-full rounded-full" style={{ background: color, width: `${share * PERCENT}%` }} />
        </span>
    );
}

export type Onward =
    | "/accounts/net-worth"
    | "/insights"
    | "/insights/breakdown"
    | "/insights/cash-flow"
    | "/insights/recap"
    | "/insights/reports"
    | "/insights/year"
    | "/transactions";

/** The search a link out of a card carries: the accounts always, the span only between Insights tabs. */
export const onwardSearch =
    (to: Onward, category?: string) =>
    (prev: DashboardSearch): DashboardSearch => ({
        accounts: prev.accounts,
        category,
        period: to.startsWith("/insights") ? prev.period : undefined,
    });

/** The outline button that closes a card by opening the screen its finding belongs to. */
export function OnwardButton({ category, children, to }: { category?: string; children: ReactNode; to: Onward }) {
    return (
        <Button
            className="h-[30px] px-2.5"
            render={<Link search={onwardSearch(to, category)} to={to} />}
            size="sm"
            variant="outline"
        >
            {children}
            <Glyph icon={ArrowUpRight01Icon} size={16} />
        </Button>
    );
}
