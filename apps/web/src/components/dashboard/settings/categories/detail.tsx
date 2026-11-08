import { RiArrowLeftSLine, RiArrowRightSLine, RiAddLine, RiPencilLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { BALANCE, Card, Head, TD, Table } from "@/components/dashboard/accounts/accounts-screen";
import { KpiBand, KpiCell } from "@/components/dashboard/accounts/parts";
import { useDateFormat, usePeriodTitle } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile } from "@/components/ledger/tiles";
import { categoryBudget } from "@/lib/dashboard-series";
import { periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CategoryEditor } from "./editor";
import type { EditorTarget } from "./editor";
import { categoryFigures, liveCategories } from "./model";

const OB = "dash-ob h-9 gap-1.5 rounded-[10px] px-3 [&>svg]:size-4";
const ENTRIES_SHOWN = 10;
const PERCENT = 100;
const MIN_BAR = 2;

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
        <Link className="text-muted-foreground flex items-center gap-1 text-[13px]" to="/app/settings/categories">
            <RiArrowLeftSLine size={18} />
            <span className="max-sm:sr-only">{parent?.name ?? copy.title}</span>
        </Link>
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
    const peak = Math.max(...figures.months.map((month) => month.amount), budget?.limit ?? 0, 1);
    const shown = figures.rows.slice(0, ENTRIES_SHOWN);
    const names = ledger.categories;

    return (
        <>
            <div className="flex min-h-16 flex-wrap items-center gap-2 py-2">
                {back}
                <LookTile look={category} size="lg" />
                <h1 className="mr-auto min-w-0 truncate text-lg font-semibold tracking-[-0.02em]">{category.name}</h1>
                <div className="flex items-center gap-1">
                    <button
                        aria-label={copy.previousMonth.value}
                        className="dash-icon-btn"
                        onClick={() => setKey(shiftPeriodKey(key, -1))}
                        type="button"
                    >
                        <RiArrowLeftSLine size={18} />
                    </button>
                    <span className="dash-figure text-[13px] font-medium whitespace-nowrap">{periodTitle(period)}</span>
                    <button
                        aria-label={copy.nextMonth.value}
                        className="dash-icon-btn"
                        disabled={key >= filters.currentKey}
                        onClick={() => setKey(shiftPeriodKey(key, 1))}
                        type="button"
                    >
                        <RiArrowRightSLine size={18} />
                    </button>
                </div>
                <button className={OB} onClick={() => setEditing({ doc: category })} type="button">
                    <RiPencilLine />
                    {copy.edit}
                </button>
            </div>
            <div className="flex flex-col gap-4">
                <KpiBand columns={4}>
                    <KpiCell
                        color={category.color ?? ""}
                        label={category.income ? copy.earned : copy.spent}
                        value={money(figures.spent, ledger.currency)}
                    >
                        {copy.ofSpending({ percent: Math.round(figures.share * PERCENT) })}
                    </KpiCell>
                    <KpiCell
                        color={category.color ?? ""}
                        label={copy.limit}
                        quiet={!budget}
                        value={budget ? money(budget.limit, ledger.currency) : copy.noLimit.value}
                    >
                        {budget
                            ? (budget.overBudget ? copy.over : copy.under)({
                                  amount: money(Math.abs(budget.remaining), ledger.currency),
                              })
                            : null}
                    </KpiCell>
                    <KpiCell
                        color={category.color ?? ""}
                        label={copy.typical}
                        value={figures.typical === null ? "-" : money(figures.typical, ledger.currency)}
                    >
                        {copy.typicalHint}
                    </KpiCell>
                    <KpiCell color={category.color ?? ""} label={copy.entries} value={String(figures.count)}>
                        {copy.allTime({ count: figures.allTime })}
                    </KpiCell>
                </KpiBand>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <Card>
                        <Head title={copy.last5} />
                        <ol className="flex h-[200px] items-end gap-3 px-5 pb-4">
                            {figures.months.map((month) => (
                                <li className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5" key={month.key}>
                                    <span className="dash-figure text-muted-foreground truncate text-center text-xs">
                                        {money(month.amount, ledger.currency)}
                                    </span>
                                    <span
                                        className="block rounded-md"
                                        style={{
                                            background: category.color ?? undefined,
                                            height: `${Math.max(MIN_BAR, (month.amount / peak) * (PERCENT - 30))}%`,
                                            opacity: month.key === key ? 1 : 0.45,
                                        }}
                                    />
                                    <span className="text-muted-foreground truncate text-center text-xs">
                                        {date.month(month.key).slice(0, 3)}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </Card>
                    {category.parentId === null ? (
                        <Card>
                            <Head title={copy.subcategories} />
                            {children.map((child) => (
                                <Link
                                    className="border-border flex h-11 items-center gap-2.5 border-t px-5 text-[13px]"
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
                                <div className="border-border text-muted-foreground flex h-11 items-center justify-between border-t px-5 text-[13px]">
                                    <span>{copy.notInSub}</span>
                                    <span className="dash-figure">{money(unfiled, ledger.currency)}</span>
                                </div>
                            ) : null}
                            <button
                                className="border-border text-muted-foreground hover:text-foreground flex h-11 w-full items-center gap-2 border-t px-5 text-[13px]"
                                onClick={() => setEditing({ income: category.income, parentId: category.localId })}
                                type="button"
                            >
                                <RiAddLine size={15} />
                                {copy.addSubcategory}
                            </button>
                        </Card>
                    ) : null}
                </div>
                <Card>
                    <Head
                        aside={
                            <Link
                                className="text-foreground font-sans"
                                search={{ category: category.localId }}
                                to="/app/transactions"
                            >
                                {copy.viewAll}
                            </Link>
                        }
                        title={copy.entries}
                    />
                    {shown.length === 0 ? (
                        <p className="text-muted-foreground border-t px-5 py-8 text-center text-sm">{copy.noEntries}</p>
                    ) : (
                        <Table head={[copy.merchant, copy.account, copy.date, copy.amount]} numbers={1}>
                            {shown.map((row) => (
                                <tr key={row.id}>
                                    <td className={`${TD} max-w-[260px]`}>
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
                                    </td>
                                    <td className={`${TD} text-muted-foreground`}>
                                        {row.accountId ? ledger.accounts.get(row.accountId)?.name : null}
                                    </td>
                                    <td className={`${TD} dash-figure text-muted-foreground`}>{date.day(row.day)}</td>
                                    <td className={`${TD} ${BALANCE}`}>{money(row.amount, ledger.currency)}</td>
                                </tr>
                            ))}
                        </Table>
                    )}
                    <div className="dash-card-foot flex justify-between pr-5">
                        <span className="dash-figure">
                            {shown.length} / {figures.count}
                        </span>
                        <span className="dash-figure">{money(figures.spent, ledger.currency)}</span>
                    </div>
                </Card>
            </div>
            {editing ? <CategoryEditor onClose={() => setEditing(null)} target={editing} /> : null}
        </>
    );
}
