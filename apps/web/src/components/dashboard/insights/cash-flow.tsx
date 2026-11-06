import { Link } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { SankeyChart } from "@/components/charts/sankey-chart";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { cn } from "@/lib/utils";

import { CategoryTile } from "./category-tile";
import { KEPT_COLOR, flowOf } from "./flow";
import type { FlowRow } from "./flow";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";
import { useWide } from "./use-wide";

const HEAD_HEIGHT = 36;
const ROW_HEIGHT = 38;
const MIN_CHART_HEIGHT = 200;
const STACKED_CHART_HEIGHT = 260;
const TABLE_WIDTH = 430;
const RIBBON_TAPER = 0.3;
const CHART_WIDTH = 540;

type Format = ReturnType<typeof useInsightsFormat>;

interface TableProps {
    dashboard: Dashboard;
    fmt: Format;
    model: InsightsModel;
    rows: readonly FlowRow[];
}

function BudgetCells({ categoryId, fmt, model }: { categoryId: string; fmt: Format; model: InsightsModel }) {
    const copy = useIntlayer("dashboard-insights");
    const budget = model.budgets.get(categoryId);
    if (!model.budgeted) {
        return <td aria-hidden className="border-border/60 border-b" colSpan={2} />;
    }
    if (!budget) {
        return (
            <td
                className="text-muted-foreground border-border/60 border-b pl-2.5 text-right font-mono text-xs"
                colSpan={2}
            >
                {copy.budget.none}
            </td>
        );
    }
    const color = model.flow.nodes.find((node) => node.id === `out:${categoryId}`)?.color;
    const share = budget.effectiveLimit > 0 ? Math.min(budget.spent / budget.effectiveLimit, 1) : 1;
    return (
        <>
            <td className="border-border/60 border-b pl-2.5">
                <span className="sr-only">{fmt.amount(budget.effectiveLimit)}</span>
                <div aria-hidden className="bg-border hidden h-1 overflow-hidden rounded-full sm:block">
                    <div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color ?? "var(--color-foreground)", width: `${share * 100}%` }}
                    />
                </div>
            </td>
            <td
                className={cn(
                    "border-border/60 border-b pl-2.5 text-right font-mono text-xs",
                    budget.overBudget ? "text-destructive" : "text-muted-foreground"
                )}
            >
                {fmt.amount(budget.remaining)}
            </td>
        </>
    );
}

function CategoryRow({ dashboard, fmt, model, row }: TableProps & { row: FlowRow }) {
    const category = dashboard.ledger.categories.get(row.id);
    return (
        <tr className="hover:bg-muted relative" style={{ height: ROW_HEIGHT }}>
            <th className="border-border/60 border-b text-left font-normal" scope="row">
                <div className="flex min-w-0 items-center gap-2">
                    <CategoryTile color={category?.color ?? KEPT_COLOR} look={model.looks.get(row.id)} />
                    <Link
                        className="truncate font-medium before:absolute before:inset-0"
                        search={(previous) => ({ ...previous, category: row.id })}
                        to="/app"
                    >
                        {category?.name}
                    </Link>
                </div>
            </th>
            <td className="border-border/60 border-b pl-2.5 text-right font-mono text-xs">{fmt.amount(row.amount)}</td>
            <BudgetCells categoryId={row.id} fmt={fmt} model={model} />
        </tr>
    );
}

function KeptRow({ fmt, model, row }: Pick<TableProps, "fmt" | "model"> & { row: FlowRow }) {
    const { measures } = useIntlayer("dashboard-insights");
    const share = model.flow.income > 0 ? Math.round((row.amount / model.flow.income) * 100) : 0;
    return (
        <tr style={{ height: ROW_HEIGHT }}>
            <th
                aria-label={measures.kept.value}
                className="border-border/60 border-b text-left font-normal"
                scope="row"
            >
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden
                        className="size-5 shrink-0 rounded-[6px]"
                        style={{ backgroundColor: KEPT_COLOR }}
                    />
                    <span className="truncate font-medium">{measures.kept}</span>
                </div>
            </th>
            <td className="border-border/60 border-b pl-2.5 text-right font-mono text-xs">{fmt.amount(row.amount)}</td>
            <td aria-hidden className="border-border/60 border-b" />
            <td className="text-muted-foreground border-border/60 border-b pl-2.5 text-right font-mono text-xs">
                {share}%
            </td>
        </tr>
    );
}

function FlowTable(props: TableProps) {
    const { table } = useIntlayer("dashboard-insights");
    return (
        <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
                <col />
                <col className="w-[86px]" />
                <col className="w-0 sm:w-[108px]" />
                <col className="w-[88px]" />
            </colgroup>
            <thead>
                <tr className="text-muted-foreground text-xs" style={{ height: HEAD_HEIGHT }}>
                    <th className="text-left font-normal" scope="col">
                        {table.category}
                    </th>
                    <th className="pl-2.5 text-right font-normal" scope="col">
                        {table.spent}
                    </th>
                    <th className="hidden pl-2.5 text-left font-normal sm:table-cell" scope="col">
                        {table.budget}
                    </th>
                    <th className="pl-2.5 text-right font-normal" scope="col">
                        {table.left}
                    </th>
                </tr>
            </thead>
            <tbody>
                {props.rows.map((row) =>
                    row.kind === "kept" ? (
                        <KeptRow fmt={props.fmt} key={row.id} model={props.model} row={row} />
                    ) : (
                        <CategoryRow key={row.id} {...props} row={row} />
                    )
                )}
            </tbody>
        </table>
    );
}

export function CashFlowSection({ model }: { model: InsightsModel }) {
    const dashboard = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(dashboard.ledger);
    const wide = useWide();
    const { links, nodes, rows } = flowOf(model.flow, {
        hub: copy.cashFlow.hub.value,
        savings: copy.cashFlow.savings.value,
    });
    const empty = model.flow.income === 0 && model.flow.spent === 0;
    return (
        <section className="border-border border-b px-5 pt-3.5 pb-4" id="cash-flow">
            <h2 className="text-[13px] font-semibold">{copy.cashFlow.title}</h2>
            {empty ? (
                <p className="text-muted-foreground mt-3 text-[13px]">{copy.empty.cashFlow}</p>
            ) : (
                <div
                    className="mt-1 grid items-start gap-x-3"
                    style={wide ? { gridTemplateColumns: `minmax(0, 1fr) ${TABLE_WIDTH}px` } : undefined}
                >
                    <SankeyChart
                        ariaLabel={copy.cashFlow.title.value}
                        height={
                            wide
                                ? Math.max(HEAD_HEIGHT + rows.length * ROW_HEIGHT, MIN_CHART_HEIGHT)
                                : STACKED_CHART_HEIGHT
                        }
                        initialWidth={wide ? CHART_WIDTH : 340}
                        links={links}
                        nodes={nodes}
                        targetRows={wide ? { height: ROW_HEIGHT, taper: RIBBON_TAPER, top: HEAD_HEIGHT } : undefined}
                    >
                        <SankeyChart.Links />
                        <SankeyChart.Nodes />
                        <SankeyChart.Labels formatValue={fmt.amount} />
                        <SankeyChart.Tooltip formatValue={fmt.amount} />
                    </SankeyChart>
                    <FlowTable dashboard={dashboard} fmt={fmt} model={model} rows={rows} />
                </div>
            )}
        </section>
    );
}
