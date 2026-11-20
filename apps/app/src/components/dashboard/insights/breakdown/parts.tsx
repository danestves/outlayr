import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import type { ComponentProps, ReactNode } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import { FIGURE } from "../parts";

export const CELL_BASE = "px-3 first:ps-4 last:pe-4";
export const CELL = `h-8.5 ${CELL_BASE}`;
export const HEAD_BASE = "text-muted-foreground px-3 text-app-caption font-medium first:ps-4 last:pe-4";
export const HEAD = `h-8 ${HEAD_BASE}`;
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
            className={`${figures.some((figure) => figure.foot) ? "py-4" : "py-3.5"} max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-5 max-lg:divide-x-0 max-lg:*:px-0 lg:grid lg:auto-cols-fr lg:grid-flow-col`}
            surface
        >
            {figures.map((figure, index) => (
                <Kpi className="min-w-0 gap-0" key={index}>
                    <Kpi.Title>{figure.label}</Kpi.Title>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2">
                        <Kpi.Value
                            className={`${figure.plain ? "" : FIGURE} text-app-figure mt-0.5 font-semibold whitespace-nowrap ${
                                figure.tone === "muted" ? "text-muted-foreground" : ""
                            }`}
                            style={toneStyle(figure.tone)}
                        >
                            {figure.value}
                        </Kpi.Value>
                        {figure.pill}
                    </div>
                    {figure.foot ? (
                        <div className="text-muted-foreground text-app-caption mt-0.5 truncate leading-4">
                            {figure.foot}
                        </div>
                    ) : null}
                </Kpi>
            ))}
            {sentence ? (
                <Kpi className="min-w-0 justify-center gap-0 max-lg:col-span-2">
                    <p className="text-app-label leading-4.5">{sentence}</p>
                </Kpi>
            ) : null}
        </Kpi.Group>
    );
}

export function Table({ children, className = "", ...props }: ComponentProps<"table">) {
    return (
        <div className="overflow-x-auto">
            <table
                className={`[&_tbody]:border-border text-app-body w-full min-w-160 border-collapse [&_tbody]:border-t ${className}`}
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

/** The outline button a card carries to open the screen its figures belong to. */
export function OpenButton({
    children,
    render,
}: {
    children: ReactNode;
    render: ComponentProps<typeof Button>["render"];
}) {
    return (
        <Button className="text-app-label h-8 gap-1.5 px-3" render={render} size="sm" variant="outline">
            {children}
            <Glyph icon={ArrowUpRight01Icon} size={16} />
        </Button>
    );
}
