import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import type { ComponentProps, ReactNode } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import { FIGURE } from "../parts";

export const CELL_BASE = "px-3 first:ps-4 last:pe-4";
export const CELL = `h-[34px] ${CELL_BASE}`;
export const HEAD_BASE = "text-muted-foreground px-3 text-xs leading-4 font-medium first:ps-4 last:pe-4";
export const HEAD = `h-[32px] ${HEAD_BASE}`;
export const NUM = `${FIGURE} text-right whitespace-nowrap`;

export interface StripFigure {
    foot?: ReactNode;
    label: ReactNode;
    /** A value that is a name, not a figure, so it is not set in the figure face. */
    plain?: boolean;
    pill?: ReactNode;
    tone?: "income" | "muted" | "poor";
    value: ReactNode;
}

const toneStyle = (tone: StripFigure["tone"]) => {
    if (tone === "income") {
        return { color: "var(--color-app-income)" };
    }
    return tone === "poor" ? { color: "var(--color-app-spend)" } : undefined;
};

/** The figures that open the tab, each with its change beside it, and a closing sentence. */
export function Strip({ figures, sentence }: { figures: readonly StripFigure[]; sentence?: ReactNode }) {
    return (
        <Kpi.Group
            className={`${figures.some((figure) => figure.foot) ? "py-4" : "py-[14px]"} max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-5 max-lg:divide-x-0 max-lg:*:px-0 lg:grid lg:auto-cols-fr lg:grid-flow-col`}
            surface
        >
            {figures.map((figure, index) => (
                <Kpi className="min-w-0 gap-0" key={index}>
                    <Kpi.Title>{figure.label}</Kpi.Title>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2">
                        <Kpi.Value
                            className={`${figure.plain ? "tracking-[-0.01em]" : `${FIGURE} tracking-[-0.04em]`} mt-0.5 text-[22px] leading-[30px] font-semibold whitespace-nowrap ${
                                figure.tone === "muted" ? "text-muted-foreground" : ""
                            }`}
                            style={toneStyle(figure.tone)}
                        >
                            {figure.value}
                        </Kpi.Value>
                        {figure.pill}
                    </div>
                    {figure.foot ? (
                        <div className="text-muted-foreground mt-0.5 truncate text-xs leading-4">{figure.foot}</div>
                    ) : null}
                </Kpi>
            ))}
            {sentence ? (
                <Kpi className="min-w-0 justify-center gap-0 max-lg:col-span-2">
                    <p className="text-[13px] leading-[18px]">{sentence}</p>
                </Kpi>
            ) : null}
        </Kpi.Group>
    );
}

export function Table({ children, className = "", ...props }: ComponentProps<"table">) {
    return (
        <div className="overflow-x-auto">
            <table
                className={`[&_tbody]:border-border w-full min-w-[640px] border-collapse text-sm [&_tbody]:border-t ${className}`}
                {...props}
            >
                {children}
            </table>
        </div>
    );
}

export function Row({ children, className = "", ...props }: ComponentProps<"tr">) {
    return (
        <tr className={`border-border border-t first:border-t-0 ${className}`} {...props}>
            {children}
        </tr>
    );
}

const GHOST_BARS = [
    24, 62, 34, 22, 46, 48, 46, 44, 28, 26, 68, 38, 62, 76, 86, 90, 36, 36, 74, 62, 26, 66, 86, 82, 30, 38, 18, 90, 40,
    70, 56,
];
const GHOST_LINE = "border-app-ghost rounded-full border";

/** Outlines of a chart and a table, behind the words of an empty tab. */
export function Ghost() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-x-5 top-6 -z-10 flex flex-col gap-6">
            <div className="border-app-ghost flex h-[150px] items-end gap-2.5 border-b px-1">
                {GHOST_BARS.map((height, index) => (
                    <span
                        className="border-app-ghost min-w-0 flex-1 rounded-[3px] border"
                        key={index}
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>
            <div className="flex flex-col gap-4">
                {[0, 1, 2].map((row) => (
                    <div className="flex items-center gap-8" key={row}>
                        <span className={`${GHOST_LINE} h-3.5 w-20`} />
                        <span className={`${GHOST_LINE} h-3.5 flex-1`} />
                        <span className={`${GHOST_LINE} h-3.5 w-12`} />
                        <span className={`${GHOST_LINE} h-3.5 w-16`} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** The outline button a card carries to open the screen its figures belong to. */
export function OpenButton({
    children,
    render,
}: {
    children: ReactNode;
    render: ComponentProps<typeof Button>["render"];
}) {
    return (
        <Button className="h-8 gap-1.5 px-3 text-[13px]" render={render} size="sm" variant="outline">
            {children}
            <Glyph icon={ArrowUpRight01Icon} size={16} />
        </Button>
    );
}
