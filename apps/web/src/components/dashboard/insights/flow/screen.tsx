import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useContext, useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { categoryBudgets } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import { periodKindOf } from "@/lib/dashboard-series-period";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { InsightsBar, PeriodControls } from "../bar";
import { useInsightsFormat } from "../format";
import { Card, onwardSearch } from "../parts";
import { Drill } from "./drill";
import { FlowList } from "./lists";
import type { ListRow } from "./lists";
import { flowMap } from "./model";
import type { FlowEdge, FlowMap } from "./model";
import { QuietFlow } from "./quiet";
import { Sankey } from "./sankey";
import type { ChartNode, ChartTip } from "./sankey";
import { Strip } from "./strip";
import type { Cell } from "./strip";

const PERCENT = 100;
const percent = (share: number) => `${Math.round(share * PERCENT)}%`;
const HUB_COLOR = "var(--color-muted-foreground)";
const CHART_ROW = "xl:h-[752px]";

type Fmt = ReturnType<typeof useInsightsFormat>;

function useFlow() {
    const { filters, ledger } = useDashboard();
    const { accounts, span } = filters;
    return useMemo(() => {
        const budgets =
            accounts.length === 0 && (periodKindOf(span.key) ?? "month") === "month"
                ? categoryBudgets(ledger, span)
                : new Map<string, CategoryBudget>();
        return { budgets, map: flowMap(ledger, span, { accounts }) };
    }, [accounts, ledger, span]);
}

function useNodes(map: FlowMap, budgets: ReadonlyMap<string, CategoryBudget>, fmt: Fmt) {
    const copy = useIntlayer("dashboard-insights-flow");
    const categoryName = useCategoryName();
    return useMemo(() => {
        const hubName = map.deficit ? copy.hub.spent.value : copy.hub.income.value;
        const nameOf = (edge: FlowEdge) => {
            if (edge.tone === "kept") {
                return copy.kpi.kept.value;
            }
            if (edge.tone === "savings") {
                return copy.kpi.savings.value;
            }
            return categoryName({ id: edge.categoryId ?? "", name: edge.label });
        };
        const shareRow = (edge: FlowEdge, label: string) =>
            edge.share === null ? [] : [{ label, value: percent(edge.share) }];
        const budgetRow = (edge: FlowEdge) => {
            const budget = edge.categoryId === null ? undefined : budgets.get(edge.categoryId);
            if (!budget) {
                return [];
            }
            const over = budget.overBudget;
            const amount = fmt.amount(Math.abs(over ? budget.spent - budget.effectiveLimit : budget.remaining));
            return [
                {
                    label: copy.tip.budget.value,
                    tone: over ? ("poor" as const) : undefined,
                    value: (over ? copy.drill.over : copy.drill.under)({ amount }).value,
                },
            ];
        };
        const tipOf = (edge: FlowEdge, source: boolean): ChartTip => {
            const name = nameOf(edge);
            const rows = [
                ...shareRow(edge, map.deficit && !source ? copy.tip.ofSpending.value : copy.tip.ofIncome.value),
                ...(source ? [] : budgetRow(edge)),
            ];
            const drillable = !source && edge.tone === "category";
            const title = (() => {
                if (edge.tone === "savings") {
                    return name;
                }
                if (source) {
                    return copy.tip.toCategory({ from: name, to: hubName }).value;
                }
                return map.deficit ? name : copy.tip.toCategory({ from: hubName, to: name }).value;
            })();
            return {
                open: drillable ? copy.tip.drill.value : undefined,
                rows,
                title,
                value: fmt.amount(edge.amount),
            };
        };
        const nodeOf =
            (source: boolean) =>
            (edge: FlowEdge): ChartNode => ({
                amount: edge.amount,
                categoryId: edge.categoryId,
                color: edge.color,
                id: edge.id,
                label: edge.label,
                name: nameOf(edge),
                note:
                    source || edge.share === null
                        ? fmt.amount(edge.amount)
                        : `${fmt.amount(edge.amount)} · ${percent(edge.share)}`,
                tip: tipOf(edge, source),
                tone: edge.tone,
            });
        return {
            hubName,
            nameOf,
            sources: map.sources.map(nodeOf(true)),
            targets: map.targets.map(nodeOf(false)),
        };
    }, [budgets, categoryName, copy, fmt, map]);
}

function useSentence(map: FlowMap, fmt: Fmt) {
    const { sentence } = useIntlayer("dashboard-insights-flow");
    const categoryName = useCategoryName();
    const top = map.targets.find((edge) => edge.tone === "category");
    if (map.deficit) {
        return sentence.deficit({ amount: fmt.amount(-map.kept) });
    }
    const kept = Math.round((map.kept / map.income) * PERCENT);
    if (!top) {
        return sentence.keptOnly({ kept: String(kept) });
    }
    const values = {
        category: categoryName({ id: top.categoryId ?? "", name: top.label }),
        percent: String(Math.round((top.amount / map.income) * PERCENT)),
    };
    return map.kept > 0 ? sentence.kept({ ...values, kept: String(kept) }) : sentence.even(values);
}

function useCells(map: FlowMap, fmt: Fmt): Cell[] {
    const { kpi } = useIntlayer("dashboard-insights-flow");
    const quiet = map.income === 0 && map.spent === 0;
    const keptTone = (() => {
        if (map.kept === 0) {
            return "muted";
        }
        return map.kept > 0 ? "income" : "spend";
    })();
    return [
        {
            label: kpi.in,
            tone: map.income > 0 ? "income" : "muted",
            value: map.income > 0 ? fmt.signed(map.income) : fmt.amount(0),
        },
        {
            label: kpi.out,
            tone: quiet ? "muted" : undefined,
            value: map.spent === 0 ? fmt.amount(0) : fmt.amount(-map.spent),
        },
        {
            label: map.deficit ? kpi.savings : kpi.kept,
            tone: keptTone,
            value: map.kept === 0 ? fmt.amount(0) : fmt.signed(map.kept),
        },
    ];
}

function Quiet({ spanName }: { spanName: string }) {
    const copy = useIntlayer("dashboard-insights-flow");
    const { open } = useAccountFlows();
    return (
        <Card className="mt-4 xl:h-[752px]" panelClassName="p-0" title={copy.chart}>
            <div className="dash-empty relative isolate min-h-[560px] justify-start pt-[368px] xl:min-h-[698px]">
                <QuietFlow />
                <b className="text-[15px] font-semibold">{copy.empty.title}</b>
                <p className="text-muted-foreground mb-2.5 max-w-80 text-[13px]">
                    {copy.empty.line({ span: spanName })}
                </p>
                <Button onClick={() => open({ kind: "entry" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {copy.empty.add}
                </Button>
            </div>
        </Card>
    );
}

function Flow() {
    const { filters, ledger } = useDashboard();
    const { span } = filters;
    const copy = useIntlayer("dashboard-insights-flow");
    const fmt = useInsightsFormat(ledger);
    const navigate = useNavigate();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { budgets, map } = useFlow();
    const nodes = useNodes(map, budgets, fmt);
    const cells = useCells(map, fmt);
    const sentence = useSentence(map, fmt);
    const [active, setActive] = useState<string | null>(null);
    const quiet = map.income === 0 && map.spent === 0;
    const rowOf = (edge: FlowEdge, tone: ListRow["tone"], linked: boolean): ListRow => ({
        amount: fmt.signed(tone === "income" ? edge.amount : -edge.amount),
        categoryId: linked && edge.tone === "category" ? edge.categoryId : null,
        color: edge.color,
        id: edge.id,
        name: nodes.nameOf(edge),
        share: edge.share,
        tone,
    });
    const wentTo = map.targets.map((edge) => rowOf(edge, edge.tone === "kept" ? "income" : "plain", true));
    const cameFrom = map.sources.filter((edge) => edge.tone === "category").map((edge) => rowOf(edge, "income", false));
    return (
        <>
            <InsightsBar>
                <PeriodControls />
            </InsightsBar>
            <div className="mt-4">
                <Strip aside={quiet || !incomeTracking ? undefined : sentence} cells={cells} />
            </div>
            {quiet ? (
                <Quiet spanName={fmt.spanShort(span)} />
            ) : (
                <div className={`mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_344px] ${CHART_ROW}`}>
                    <Card
                        action={
                            <span className="dash-figure text-muted-foreground text-[13px] font-normal">
                                {(map.deficit ? copy.ofOut : copy.ofIn)({
                                    amount: fmt.amount(map.deficit ? map.spent : map.income),
                                })}
                            </span>
                        }
                        className="min-h-[560px]"
                        panelClassName="relative overflow-hidden p-0"
                        title={copy.chart}
                    >
                        <Sankey
                            active={active}
                            drawnOn={map.deficit}
                            hub={{ color: HUB_COLOR, label: nodes.hubName, note: fmt.amount(map.hub.amount) }}
                            label={copy.chartLabel.value}
                            mode="flow"
                            onActive={setActive}
                            onOpen={(node) =>
                                navigate({
                                    search: onwardSearch("/app/insights/cash-flow", node.categoryId ?? undefined),
                                    to: "/app/insights/cash-flow",
                                })
                            }
                            sources={nodes.sources}
                            targets={nodes.targets}
                        />
                    </Card>
                    <div className="flex min-h-0 flex-col gap-4">
                        <FlowList
                            active={active}
                            className="flex-1"
                            onActive={setActive}
                            rows={wentTo}
                            subtitle={map.deficit ? copy.ofSpending.value : copy.ofIncome.value}
                            title={copy.wentTo.value}
                        />
                        <FlowList
                            active={active}
                            onActive={setActive}
                            padded
                            rows={cameFrom}
                            subtitle={copy.ofIncome.value}
                            title={copy.cameFrom.value}
                        />
                    </div>
                </div>
            )}
        </>
    );
}

export function CashFlowScreen() {
    const { category } = useDashboard().filters;
    return category === null ? <Flow /> : <Drill categoryId={category} />;
}
