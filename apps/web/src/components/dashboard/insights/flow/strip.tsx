import { Kpi } from "panelui-web/kpi";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Tone = "income" | "muted" | "spend";

const TONES = {
    income: "text-app-income",
    muted: "text-muted-foreground",
    spend: "text-app-spend",
} as const satisfies Record<Tone, string>;

export interface Cell {
    badge?: ReactNode;
    label: ReactNode;
    note?: ReactNode;
    tone?: Tone;
    value: ReactNode;
}

/** The figures that open a flow screen, and an optional sentence set in the last column. */
export function Strip({ aside, cells, dense = false }: { aside?: ReactNode; cells: readonly Cell[]; dense?: boolean }) {
    const columns = cells.length + (aside === undefined ? 0 : 1);
    return (
        <Kpi.Group
            className={cn(
                "grid px-5 py-4",
                columns >= 4
                    ? "grid-flow-row grid-cols-2 gap-y-4 max-xl:*:border-0! max-xl:*:px-0! max-xl:*:before:hidden max-xl:*:after:hidden xl:auto-cols-fr xl:grid-flow-col"
                    : "max-lg:grid-flow-row max-lg:grid-cols-2 max-lg:gap-y-4 lg:auto-cols-fr lg:grid-flow-col",
                columns === 3 && "lg:grid-cols-3"
            )}
            surface
        >
            {cells.map((cell, index) => (
                <Kpi className="min-w-0 gap-0" key={index}>
                    <Kpi.Title>{cell.label}</Kpi.Title>
                    <Kpi.Value
                        className={cn(
                            "dash-figure flex items-center gap-2 font-semibold tracking-[-0.04em]",
                            dense ? "mt-0.5 text-[22px] leading-[30px]" : "mt-1 text-2xl leading-8",
                            cell.tone && TONES[cell.tone]
                        )}
                    >
                        <span className="min-w-0 truncate">{cell.value}</span>
                        {cell.badge}
                    </Kpi.Value>
                    {cell.note === undefined ? null : (
                        <span className="text-muted-foreground mt-0.5 block truncate text-xs leading-4">
                            {cell.note}
                        </span>
                    )}
                </Kpi>
            ))}
            {aside === undefined ? null : (
                <div className="flex min-w-0 items-center text-[13px] leading-[18px]">{aside}</div>
            )}
        </Kpi.Group>
    );
}
