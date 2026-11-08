import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { BarChart } from "panelui-web/bar-chart";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDateFormat, usePeriodTitle } from "@/components/dashboard/home/format";
import { OverlayPresence } from "@/components/dashboard/overlay-presence";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile } from "@/components/ledger/tiles";
import { categoryBudget } from "@/lib/dashboard-series";
import { periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { SettingsCard } from "../parts";
import { CategoryEditor } from "./editor";
import type { EditorTarget } from "./editor";
import { categoryFigures, liveCategories } from "./model";

const ENTRIES_SHOWN = 10;
const PERCENT = 100;
const CELL = "whitespace-nowrap";
const FIGURE_NOTE = "text-muted-foreground min-w-0 truncate text-[13px] leading-5";
const TWO_BY_TWO =
    "max-lg:grid max-lg:grid-cols-2 max-lg:gap-y-5 max-lg:divide-x-0 max-lg:*:odd:border-e max-lg:*:odd:ps-0 max-lg:*:odd:pe-3 max-lg:*:even:ps-3 max-lg:*:even:pe-0";

function Figure({
    children,
    label,
    quiet,
    value,
}: {
    children?: ReactNode;
    label: ReactNode;
    quiet?: boolean;
    value: ReactNode;
}) {
    return (
        <Kpi>
            <Kpi.Header>
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value
                className={`dash-figure text-2xl leading-8 font-semibold tracking-[-0.04em] wrap-anywhere ${quiet ? "text-muted-foreground" : ""}`}
            >
                {value}
            </Kpi.Value>
            <p className={FIGURE_NOTE}>{children}</p>
        </Kpi>
    );
}

export function CategoryDetail({ categoryId }: { categoryId: string }) {
    const copy = useIntlayer("dashboard-categories");
    const { filters, ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const periodTitle = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const [key, setKey] = useState(filters.currentKey);
    const [editing, setEditing] = useState<EditorTarget | null>(null);
    const period = useMemo(() => periodOf(key, ledger.firstDayOfMonth), [key, ledger.firstDayOfMonth]);

    const live = liveCategories(ledger.books.categories);
    const category = live.find((row) => row.localId === categoryId);
    const figures = category ? categoryFigures(ledger, category, period) : null;
    const parent = live.find((row) => row.localId === category?.parentId);

    const back = (
        <Button
            aria-label={parent?.name ?? copy.title.value}
            className="text-muted-foreground -ml-2"
            render={<Link to="/app/settings/categories" />}
            size="sm"
            variant="ghost"
        >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
            <span className="max-sm:sr-only">{parent?.name ?? copy.title}</span>
        </Button>
    );
    if (!category || !figures) {
        return (
            <>
                <div className="flex min-h-16 items-center">{back}</div>
                <p className="text-muted-foreground py-8 text-center text-sm">{copy.notFound}</p>
            </>
        );
    }

    const budget = categoryBudget(ledger, category.localId, period);
    const children = live
        .filter((row) => row.parentId === category.localId)
        .toSorted((a, b) => a.sortOrder - b.sortOrder);
    const childTotal = (id: string) =>
        figures.rows.filter((row) => row.categoryId === id).reduce((sum, row) => sum + row.amount, 0);
    const unfiled = figures.rows
        .filter((row) => row.categoryId === category.localId)
        .reduce((sum, row) => sum + row.amount, 0);
    const months = figures.months.map((month) => ({
        key: month.key,
        now: month.key === key ? month.amount : 0,
        past: month.key === key ? 0 : month.amount,
    }));
    // SAFETY: CSSProperties has no entry for custom properties; these two only recolor the chart roles below.
    const barColors = {
        "--chart-1": category.color ?? undefined,
        "--chart-2": category.color ? `color-mix(in srgb, ${category.color} 45%, transparent)` : undefined,
    } as CSSProperties;
    const shown = figures.rows.slice(0, ENTRIES_SHOWN);
    const names = ledger.categories;

    return (
        <>
            <div className="flex min-h-16 flex-wrap items-center gap-2 py-2">
                {back}
                <LookTile look={category} size="lg" />
                <h1 className="mr-auto min-w-0 truncate text-lg font-semibold tracking-[-0.02em]">{category.name}</h1>
                <div className="flex items-center gap-1">
                    <Button
                        aria-label={copy.previousMonth.value}
                        onClick={() => setKey(shiftPeriodKey(key, -1))}
                        size="icon-sm"
                        variant="ghost"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
                    </Button>
                    <span className="dash-figure text-[13px] font-medium whitespace-nowrap">{periodTitle(period)}</span>
                    <Button
                        aria-label={copy.nextMonth.value}
                        disabled={key >= filters.currentKey}
                        onClick={() => setKey(shiftPeriodKey(key, 1))}
                        size="icon-sm"
                        variant="ghost"
                    >
                        <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
                    </Button>
                </div>
                <Button onClick={() => setEditing({ doc: category })} size="sm" variant="outline">
                    <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                    {copy.edit}
                </Button>
            </div>
            <div className="flex flex-col gap-4">
                <Kpi.Group className={`rounded-2xl ${TWO_BY_TWO}`} surface>
                    <Figure
                        label={category.income ? copy.earned : copy.spent}
                        value={money(figures.spent, ledger.currency)}
                    >
                        {copy.ofSpending({ percent: Math.round(figures.share * PERCENT) })}
                    </Figure>
                    <Figure
                        label={copy.limit}
                        quiet={!budget}
                        value={budget ? money(budget.limit, ledger.currency) : copy.noLimit.value}
                    >
                        {budget
                            ? (budget.overBudget ? copy.over : copy.under)({
                                  amount: money(Math.abs(budget.remaining), ledger.currency),
                              })
                            : null}
                    </Figure>
                    <Figure
                        label={copy.typical}
                        value={figures.typical === null ? "-" : money(figures.typical, ledger.currency)}
                    >
                        {copy.typicalHint}
                    </Figure>
                    <Figure label={copy.entries} value={String(figures.count)}>
                        {copy.allTime({ count: figures.allTime })}
                    </Figure>
                </Kpi.Group>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <SettingsCard title={copy.last5}>
                        <div className="px-4 py-3" style={barColors}>
                            <BarChart aspectRatio={2.4} data={months} label={copy.last5.value} stacked xDataKey="key">
                                <BarChart.Bar color="chart-2" dataKey="past" />
                                <BarChart.Bar color="chart-1" dataKey="now" />
                                <BarChart.XAxis format={(datum) => date.month(String(datum.key)).slice(0, 3)} />
                                <BarChart.YAxis format={(value) => money(value, ledger.currency)} ticks={3} />
                                <BarChart.Tooltip
                                    formatValue={(value) => money(value, ledger.currency)}
                                    formatX={(datum) => date.month(String(datum.key))}
                                    labels={{ now: copy.spent.value, past: copy.spent.value }}
                                />
                            </BarChart>
                        </div>
                    </SettingsCard>
                    {category.parentId === null ? (
                        <SettingsCard title={copy.subcategories}>
                            {children.map((child) => (
                                <Link
                                    className="border-border flex h-11 items-center gap-2.5 border-b px-4 text-[13px]"
                                    key={child.localId}
                                    params={{ categoryId: child.localId }}
                                    to="/app/settings/categories/$categoryId"
                                >
                                    <LookTile look={child} />
                                    <span className="min-w-0 flex-1 truncate font-medium">{child.name}</span>
                                    <span className="dash-figure">
                                        {money(childTotal(child.localId), ledger.currency)}
                                    </span>
                                </Link>
                            ))}
                            {children.length > 0 ? (
                                <div className="border-border text-muted-foreground flex h-11 items-center justify-between border-b px-4 text-[13px]">
                                    <span>{copy.notInSub}</span>
                                    <span className="dash-figure">{money(unfiled, ledger.currency)}</span>
                                </div>
                            ) : null}
                            <Button
                                className="text-muted-foreground h-11 w-full justify-start rounded-none px-4"
                                onClick={() => setEditing({ income: category.income, parentId: category.localId })}
                                size="sm"
                                variant="ghost"
                            >
                                <HugeiconsIcon icon={PlusSignIcon} size={15} />
                                {copy.addSubcategory}
                            </Button>
                        </SettingsCard>
                    ) : null}
                </div>
                <SettingsCard
                    action={
                        <Button
                            render={<Link search={{ category: category.localId }} to="/app/transactions" />}
                            size="sm"
                            variant="link"
                        >
                            {copy.viewAll}
                        </Button>
                    }
                    footer={
                        <div className="flex w-full justify-between">
                            <span className="dash-figure">
                                {shown.length} / {figures.count}
                            </span>
                            <span className="dash-figure">{money(figures.spent, ledger.currency)}</span>
                        </div>
                    }
                    title={copy.entries}
                >
                    {shown.length === 0 ? (
                        <p className="text-muted-foreground px-5 py-8 text-center text-sm">{copy.noEntries}</p>
                    ) : (
                        <Table framed aria-label={copy.entries.value} maxHeight="none">
                            <Table.Header className="in-data-[sticky]:bg-card">
                                <Table.Row>
                                    <Table.Head>{copy.merchant}</Table.Head>
                                    <Table.Head>{copy.account}</Table.Head>
                                    <Table.Head>{copy.date}</Table.Head>
                                    <Table.Head align="end">{copy.amount}</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {shown.map((row) => (
                                    <Table.Row key={row.id}>
                                        <Table.Cell className={`${CELL} max-w-[260px]`}>
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="truncate font-medium">
                                                    {row.note.trim() || category.name}
                                                </span>
                                                {row.categoryId && row.categoryId !== category.localId ? (
                                                    <span className="text-muted-foreground truncate text-xs">
                                                        {names.get(row.categoryId)?.name}
                                                    </span>
                                                ) : null}
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} text-muted-foreground`}>
                                            {row.accountId ? ledger.accounts.get(row.accountId)?.name : null}
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} dash-figure text-muted-foreground`}>
                                            {date.day(row.day)}
                                        </Table.Cell>
                                        <Table.Cell align="end" className={`${CELL} dash-figure text-sm font-medium`}>
                                            {money(row.amount, ledger.currency)}
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table>
                    )}
                </SettingsCard>
            </div>
            <OverlayPresence value={editing}>
                {(target) => <CategoryEditor onClose={() => setEditing(null)} target={target} />}
            </OverlayPresence>
        </>
    );
}
