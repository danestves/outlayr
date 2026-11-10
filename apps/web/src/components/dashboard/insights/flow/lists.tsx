import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

import { onwardSearch, Card } from "../parts";

export interface ListRow {
    amount: string;
    categoryId: string | null;
    color: string;
    id: string;
    name: string;
    share: number | null;
    tone: "income" | "plain";
}

interface ListProps {
    active: string | null;
    onActive: (id: string | null) => void;
    rows: readonly ListRow[];
    subtitle: string;
    title: string;
    className?: string;
    /** Room under the last row, for a list that ends its card. */
    padded?: boolean;
}

const ROW =
    "border-border flex h-[50px] shrink-0 flex-col justify-center border-t px-5 py-[9px] outline-none first:border-t-0 transition-colors duration-150";
const HOT = "bg-foreground/[0.04]";

function Row({ active, onActive, row }: { active: boolean; onActive: ListProps["onActive"]; row: ListRow }) {
    const percent = row.share === null ? "" : `${Math.round(row.share * 100)}%`;
    const body = (
        <>
            <span className="flex items-center gap-2.5 text-[13px] font-medium">
                <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: row.color }} />
                <span className="min-w-0 truncate">{row.name}</span>
                <span className={cn("dash-figure ml-auto font-medium", row.tone === "income" && "text-app-income")}>
                    {row.amount}
                </span>
                <span className="dash-figure text-muted-foreground w-[34px] text-right text-xs font-normal">
                    {percent}
                </span>
            </span>
            <span aria-hidden className="bg-border mt-[7px] ml-5 block h-1 overflow-hidden rounded-full">
                <span
                    className="block h-full rounded-full"
                    style={{ background: row.color, width: `${(row.share ?? 0) * 100}%` }}
                />
            </span>
        </>
    );
    const events = {
        onBlur: () => onActive(null),
        onFocus: () => onActive(row.id),
        onPointerEnter: () => onActive(row.id),
        onPointerLeave: () => onActive(null),
    };
    if (row.categoryId === null) {
        return (
            <div className={cn(ROW, active && HOT)} {...events}>
                {body}
            </div>
        );
    }
    return (
        <Link
            className={cn(ROW, "focus-visible:bg-foreground/[0.04]", active && HOT)}
            search={onwardSearch("/app/insights/cash-flow", row.categoryId)}
            to="/app/insights/cash-flow"
            {...events}
        >
            {body}
        </Link>
    );
}

/** One side of the flow as rows with a share bar each. Hovering a row lights the same bar in the chart. */
export function FlowList({ active, className, onActive, padded = false, rows, subtitle, title }: ListProps) {
    return (
        <Card
            action={<span className="text-muted-foreground text-[13px]">{subtitle}</span>}
            className={className}
            panelClassName={cn("flex flex-col", padded && "pb-1.5")}
            title={title}
        >
            {rows.map((row) => (
                <Row active={active === row.id} key={row.id} onActive={onActive} row={row} />
            ))}
        </Card>
    );
}
