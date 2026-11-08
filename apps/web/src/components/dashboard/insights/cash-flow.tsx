import { Link } from "@tanstack/react-router";
import { SankeyChart } from "panelui-web/sankey-chart";
import { useContext } from "react";
import { useIntlayer } from "react-intlayer";

import { CardFrame } from "@/components/dashboard/home/card-frame";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";
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
const TABLE_WIDTH = 520;
const COLLAPSED = "max-sm:overflow-hidden max-sm:p-0 max-sm:whitespace-nowrap";
const RIBBON_TAPER = 0.3;
const PHONE_TARGETS = 6;

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
                className="text-muted-foreground border-border/60 border-b pl-2.5 text-right font-mono text-xs whitespace-nowrap"
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
            <td className={cn("border-border/60 border-b pl-2.5", COLLAPSED)}>
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
                    "border-border/60 border-b pl-2.5 text-right font-mono text-xs whitespace-nowrap",
                    budget.overBudget ? "text-destructive" : "text-muted-foreground"
                )}
            >
                {fmt.amount(budget.remaining)}
            </td>
        </>
    );
}

function VersusCell({
    amount,
    categoryId,
    fmt,
    model,
}: {
    amount: number;
    categoryId: string;
    fmt: Format;
    model: InsightsModel;
}) {
    const { table } = useIntlayer("dashboard-insights");
    if (model.usual === null) {
        return null;
    }
    const delta = Math.round(amount - (model.usual.byCategory.get(categoryId) ?? 0));
    return (
        <td
            className={cn(
                "border-border/60 border-b pl-2.5 text-right font-mono text-xs",
                COLLAPSED,
                delta > 0 && "text-destructive",
                delta < 0 && "text-success",
                delta === 0 && "text-muted-foreground"
            )}
        >
            {delta === 0 ? table.same : fmt.signedWhole(delta)}
        </td>
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
            <td className="border-border/60 border-b pl-2.5 text-right font-mono text-xs whitespace-nowrap">
                {fmt.amount(row.amount)}
            </td>
            <VersusCell amount={row.amount} categoryId={row.id} fmt={fmt} model={model} />
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
                    <span aria-hidden className="size-5 shrink-0 rounded-md" style={{ backgroundColor: KEPT_COLOR }} />
                    <span className="truncate font-medium">{measures.kept}</span>
                </div>
            </th>
            <td className="border-border/60 border-b pl-2.5 text-right font-mono text-xs whitespace-nowrap">
                {fmt.amount(row.amount)}
            </td>
            {model.usual === null ? null : <td aria-hidden className="border-border/60 border-b" />}
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
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
                <col />
                <col className="w-24" />
                {props.model.usual === null ? null : <col className="w-0 sm:w-22" />}
                <col className="w-0 sm:w-28" />
                <col className="w-22" />
            </colgroup>
            <thead>
                <tr className="text-muted-foreground text-xs" style={{ height: HEAD_HEIGHT }}>
                    <th className="text-left font-normal" scope="col">
                        {table.category}
                    </th>
                    <th className="pl-2.5 text-right font-normal" scope="col">
                        {table.spent}
                    </th>
                    {props.model.usual === null ? null : (
                        <th className={cn("pl-2.5 text-right font-normal", COLLAPSED)} scope="col">
                            {table.vsUsual}
                        </th>
                    )}
                    <th className={cn("pl-2.5 text-left font-normal", COLLAPSED)} scope="col">
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

function Totals({ fmt, model }: { fmt: Format; model: InsightsModel }) {
    const { measures } = useIntlayer("dashboard-insights");
    const { income, kept, spent } = model.flow;
    const parts = [
        [measures.in.value, income],
        [measures.out.value, spent],
        [kept < 0 ? measures.savings.value : measures.kept.value, Math.abs(kept)],
    ] as const;
    return (
        <dl className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
            {parts.map(([label, value]) => (
                <div className="flex gap-1" key={label}>
                    <dt>{label}</dt>
                    <dd className="text-foreground font-mono font-medium">{fmt.amount(value)}</dd>
                </div>
            ))}
        </dl>
    );
}

export function CashFlowCard({ model }: { model: InsightsModel }) {
    const dashboard = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(dashboard.ledger);
    const wide = useWide();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { links, nodes, rows } = flowOf(model.flow, {
        hub: copy.cashFlow.hub.value,
        kept: copy.measures.kept.value,
        savings: copy.cashFlow.savings.value,
    });
    const empty = model.flow.income === 0 && model.flow.spent === 0;
    if (!incomeTracking) {
        return (
            <CardFrame title={copy.trend.spending}>
                {model.flow.spent === 0 ? (
                    <p className="text-muted-foreground p-4 text-sm">{copy.empty.spending}</p>
                ) : (
                    <div className="px-4 pt-1 pb-3">
                        <FlowTable
                            dashboard={dashboard}
                            fmt={fmt}
                            model={model}
                            rows={rows.filter((row) => row.kind === "category")}
                        />
                    </div>
                )}
            </CardFrame>
        );
    }
    return (
        <CardFrame action={empty ? null : <Totals fmt={fmt} model={model} />} stackAction title={copy.cashFlow.title}>
            {empty ? (
                <p className="text-muted-foreground p-4 text-sm">{copy.empty.cashFlow}</p>
            ) : (
                <div
                    className="grid items-start gap-x-3 px-4 pt-1 pb-3"
                    style={wide ? { gridTemplateColumns: `minmax(0, 1fr) ${TABLE_WIDTH}px` } : undefined}
                >
                    <SankeyChart
                        collapse={wide ? undefined : { label: copy.changes.other.value, maxPerColumn: PHONE_TARGETS }}
                        height={
                            wide
                                ? Math.max(HEAD_HEIGHT + rows.length * ROW_HEIGHT, MIN_CHART_HEIGHT)
                                : STACKED_CHART_HEIGHT
                        }
                        label={copy.cashFlow.title.value}
                        links={links}
                        nodes={nodes}
                        targetRows={wide ? { height: ROW_HEIGHT, taper: RIBBON_TAPER, top: HEAD_HEIGHT } : undefined}
                    >
                        <SankeyChart.Links gradient />
                        <SankeyChart.Nodes />
                        <SankeyChart.Labels formatValue={fmt.amount} />
                        <SankeyChart.Tooltip formatValue={fmt.amount} />
                    </SankeyChart>
                    <FlowTable dashboard={dashboard} fmt={fmt} model={model} rows={rows} />
                </div>
            )}
        </CardFrame>
    );
}
