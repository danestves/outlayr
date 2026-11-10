import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { MerchantTile } from "@/components/ledger/tiles";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import { periodKindOf } from "@/lib/dashboard-series-period";

import { PeriodStepper } from "../bar";
import { useInsightsFormat } from "../format";
import { Card, Change } from "../parts";
import { drillOf } from "./model";
import type { Drill as DrillModel } from "./model";
import { Sankey } from "./sankey";
import type { ChartNode } from "./sankey";
import { Strip } from "./strip";
import type { Cell } from "./strip";

const PERCENT = 100;
const HUB_COLOR = "var(--color-muted-foreground)";
const percent = (share: number) => `${Math.round(share * PERCENT)}%`;

type Fmt = ReturnType<typeof useInsightsFormat>;

function useDrill(categoryId: string) {
    const { filters, ledger } = useDashboard();
    const { accounts, span } = filters;
    const categoryName = useCategoryName();
    const category = ledger.categories.get(categoryId);
    return {
        color: category?.color ?? NEUTRAL_COLOR,
        drill: useMemo(
            () =>
                drillOf(
                    ledger,
                    span,
                    { accounts },
                    categoryId,
                    accounts.length === 0 && (periodKindOf(span.key) ?? "month") === "month"
                ),
            [accounts, categoryId, ledger, span]
        ),
        name: category ? categoryName(category) : "",
    };
}

function useCells(drill: DrillModel, fmt: Fmt): Cell[] {
    const copy = useIntlayer("dashboard-insights-flow");
    const { budget, ofIncome, prior, spent, versus } = drill;
    const cells: Cell[] = [{ label: copy.drill.spent, value: fmt.amount(spent) }];
    if (ofIncome !== null) {
        cells.push({ label: copy.drill.ofIncome, value: percent(ofIncome) });
    }
    if (versus) {
        cells.push({
            badge: <Change delta={versus.delta} goodDirection="down" />,
            label: copy.drill.versus({ period: fmt.spanShort(prior) }),
            value: fmt.signed(versus.amount),
        });
    }
    if (budget) {
        const over = budget.overBudget;
        const amount = fmt.amount(Math.abs(over ? spent - budget.effectiveLimit : budget.remaining));
        cells.push({
            label: copy.budget({ amount: fmt.whole(budget.effectiveLimit) }),
            tone: over ? "spend" : undefined,
            value: (over ? copy.drill.over : copy.drill.under)({ amount }),
        });
    }
    return cells;
}

function Header({ categoryId, name }: { categoryId: string; name: string }) {
    const { filters } = useDashboard();
    const copy = useIntlayer("dashboard-insights-flow");
    const { tabs } = useIntlayer("dashboard-insights-bar");
    return (
        <header className="border-border -mx-4 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 sm:-mx-6 sm:px-6">
            <Button
                aria-label={copy.back.value}
                nativeButton={false}
                render={
                    <Link
                        search={(prev) => ({ accounts: prev.accounts, period: prev.period })}
                        to="/app/insights/cash-flow"
                    />
                }
                size="icon-sm"
                variant="outline"
            >
                <Glyph icon={ArrowLeft02Icon} size={16} />
            </Button>
            <span className="text-muted-foreground text-[13px] font-medium">{tabs.cashFlow}</span>
            <Glyph className="text-muted-foreground -mx-px" icon={ArrowRight01Icon} size={16} />
            <h1 className="min-w-0 truncate text-lg leading-6 font-semibold tracking-[-0.02em]">{name}</h1>
            <div className="ml-auto flex items-center gap-2">
                <PeriodStepper span={filters.span} />
                <Button
                    className="ml-0.5 h-[30px] px-2.5"
                    nativeButton={false}
                    render={<Link params={{ categoryId }} to="/app/settings/categories/$categoryId" />}
                    size="sm"
                    variant="outline"
                >
                    {copy.drill.open}
                    <Glyph icon={ArrowUpRight01Icon} size={16} />
                </Button>
            </div>
        </header>
    );
}

function Entries({ categoryId, drill }: { categoryId: string; drill: DrillModel }) {
    const { filters, ledger } = useDashboard();
    const { span } = filters;
    const copy = useIntlayer("dashboard-insights-flow").drill;
    const fmt = useInsightsFormat(ledger);
    const last = ledger.today < span.to ? ledger.today : span.to;
    const count = drill.entries.length;
    return (
        <Card
            action={
                <Button
                    nativeButton={false}
                    render={
                        <Link
                            search={(prev) => ({
                                accounts: prev.accounts,
                                category: categoryId,
                                from: span.from,
                                to: last,
                            })}
                            to="/app/transactions"
                        />
                    }
                    className="my-px h-[30px] px-2.5"
                    size="sm"
                    variant="outline"
                >
                    {copy.seeAll}
                    <Glyph icon={ArrowUpRight01Icon} size={16} />
                </Button>
            }
            panelClassName="min-h-0 flex-none! overflow-y-auto p-0"
            title={count === 1 ? copy.entry : copy.entries({ count: String(count) })}
        >
            <Table framed maxHeight="none">
                <Table.Header className="in-data-[sticky]:bg-card">
                    <Table.Row>
                        <Table.Head>{copy.merchant}</Table.Head>
                        <Table.Head>{copy.date}</Table.Head>
                        <Table.Head align="end">{copy.amount}</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {drill.entries.map((entry) => (
                        <Table.Row key={entry.id}>
                            <Table.Cell>
                                <span className="flex items-center gap-2.5 font-medium">
                                    <MerchantTile name={entry.merchant} size="lg" />
                                    <span className="min-w-0 truncate">{entry.merchant}</span>
                                </span>
                            </Table.Cell>
                            <Table.Cell className="dash-figure text-muted-foreground">{fmt.date(entry.day)}</Table.Cell>
                            <Table.Cell align="end" className="dash-figure">
                                {fmt.amount(-entry.amount)}
                            </Table.Cell>
                        </Table.Row>
                    ))}
                    <Table.Row className="bg-muted/40 font-semibold">
                        <Table.Cell>{copy.total}</Table.Cell>
                        <Table.Cell />
                        <Table.Cell align="end" className="dash-figure">
                            {fmt.amount(-drill.spent)}
                        </Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table>
        </Card>
    );
}

export function Drill({ categoryId }: { categoryId: string }) {
    const { filters, ledger } = useDashboard();
    const { span } = filters;
    const copy = useIntlayer("dashboard-insights-flow");
    const fmt = useInsightsFormat(ledger);
    const { color, drill, name } = useDrill(categoryId);
    const cells = useCells(drill, fmt);
    const [active, setActive] = useState<string | null>(null);
    const whole = fmt.amount(drill.spent);
    const sources: ChartNode[] = [
        {
            amount: drill.spent,
            categoryId: null,
            color: HUB_COLOR,
            id: "income",
            label: "",
            name: copy.hub.income.value,
            note: whole,
            ribbon: color,
            tip: {
                rows:
                    drill.ofIncome === null ? [] : [{ label: copy.tip.ofIncome.value, value: percent(drill.ofIncome) }],
                title: copy.tip.toCategory({ from: copy.hub.income.value, to: name }).value,
                value: whole,
            },
            tone: "category",
        },
    ];
    const targets = drill.merchants.map((merchant): ChartNode => ({
        amount: merchant.amount,
        categoryId: null,
        color,
        id: `merchant:${merchant.name}`,
        label: merchant.name,
        name: merchant.name,
        note: `${fmt.amount(merchant.amount)} · ${percent(merchant.share)}`,
        tip: {
            rows: [
                { label: copy.drill.ofCategory({ category: name }).value, value: percent(merchant.share) },
                { label: copy.tip.entries.value, value: String(merchant.count) },
            ],
            title: copy.tip.toCategory({ from: name, to: merchant.name }).value,
            value: fmt.amount(merchant.amount),
        },
        tone: "category",
    }));
    return (
        <>
            <Header categoryId={categoryId} name={name} />
            <div className="mt-4">
                <Strip cells={cells} />
            </div>
            {drill.spent === 0 ? (
                <Card className="mt-4 xl:h-[752px]" panelClassName="dash-empty" title={copy.chart}>
                    <b className="text-[15px] font-semibold">{copy.drill.emptyTitle({ category: name })}</b>
                    <p className="text-muted-foreground max-w-80 text-[13px]">
                        {copy.drill.empty({ category: name, span: fmt.spanName(span) })}
                    </p>
                </Card>
            ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 xl:h-[752px] xl:grid-cols-[minmax(0,1fr)_480px]">
                    <Card
                        action={
                            <span className="dash-figure text-muted-foreground text-[13px] font-normal">
                                {copy.drill.of({ amount: whole })}
                            </span>
                        }
                        className="min-h-[560px]"
                        panelClassName="relative overflow-hidden p-0"
                        title={copy.chart}
                    >
                        <Sankey
                            active={active}
                            drawnOn={false}
                            hub={{ color, label: name, note: whole }}
                            label={copy.drill.chartLabel({ category: name }).value}
                            mode="drill"
                            onActive={setActive}
                            sources={sources}
                            targets={targets}
                        />
                    </Card>
                    <Entries categoryId={categoryId} drill={drill} />
                </div>
            )}
        </>
    );
}
