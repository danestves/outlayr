import { suggestionsNotAdded } from "@outlayr/money/category-rules";
import {
    RiAddLine,
    RiArrowRightUpLine,
    RiDeleteBin6Line,
    RiDraggable,
    RiLightbulbLine,
    RiMore2Fill,
    RiPencilLine,
} from "@remixicon/react";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { CardFrame } from "@/components/dashboard/home/card-frame";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile } from "@/components/ledger/tiles";
import { categoryBudgets } from "@/lib/dashboard-series";
import { metaFlag, useDisplayFormat, useMeta, writeSettings } from "@/lib/ledger-settings";

import { Choice, SectionHead } from "../parts";
import { CategoryEditor } from "./editor";
import type { EditorTarget } from "./editor";
import { categoryLines, categoryTree, INCOME_COLOR, liveCategories, MAX_EXPENSE_CATEGORIES } from "./model";
import type { Category } from "./model";
import { ReorderList } from "./reorder";
import { useCategoryWrites } from "./write";

// SAFETY: category-presets is generated from these names by this same camelCase rule.
const presetKey = (name: string) =>
    name
        .toLowerCase()
        .replaceAll(/[^a-z]+(.)/gu, (_, letter: string) => letter.toUpperCase())
        .replaceAll(/[^a-zA-Z]/gu, "") as keyof IntlayerPresets;

const HEAD = "first:ps-3.5 last:pe-3.5";
const CELL = "h-11 py-0 whitespace-nowrap first:ps-3.5 last:pe-3.5";
const FIGURE = `${CELL} dash-figure text-muted-foreground`;
const PHONE_COLUMNS = "max-sm:[&_tr>*:nth-child(2)]:hidden max-sm:[&_tr>*:nth-child(4)]:hidden";

type IntlayerPresets = ReturnType<typeof useIntlayer<"category-presets">>;

function RowActions({ onEdit, onSubcategory, row }: { onEdit: () => void; onSubcategory?: () => void; row: Category }) {
    const copy = useIntlayer("dashboard-categories");
    const navigate = useNavigate();
    const writes = useCategoryWrites();
    return (
        <Menu>
            <Menu.Trigger
                aria-label={copy.more({ name: row.name ?? "" }).value}
                render={<Button className="text-muted-foreground -mr-1" size="icon-sm" variant="ghost" />}
            >
                <RiMore2Fill size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item
                    onClick={() =>
                        navigate({ params: { categoryId: row.localId }, to: "/app/settings/categories/$categoryId" })
                    }
                >
                    <RiArrowRightUpLine size={16} />
                    {copy.open}
                </Menu.Item>
                <Menu.Item onClick={onEdit}>
                    <RiPencilLine size={16} />
                    {copy.edit}
                </Menu.Item>
                {onSubcategory ? (
                    <Menu.Item onClick={onSubcategory}>
                        <RiAddLine size={16} />
                        {copy.addSubcategory}
                    </Menu.Item>
                ) : null}
                <Menu.Separator />
                <Menu.Item onClick={() => writes.remove(row.localId)} variant="destructive">
                    <RiDeleteBin6Line size={16} />
                    {copy.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

function TabbedCard({ children, footer, tabs }: { children: ReactNode; footer?: ReactNode; tabs: ReactNode }) {
    return (
        <Frame className="min-w-0 rounded-2xl" variant="band">
            <Frame.Header className="min-h-10">{tabs}</Frame.Header>
            <Frame.Panel className="group-data-[variant=band]/frame:rounded-[10px]">{children}</Frame.Panel>
            {footer ? <Frame.Footer className="min-h-11 flex-wrap text-sm">{footer}</Frame.Footer> : null}
        </Frame>
    );
}

function Left({ remaining, over, currency }: { currency: string; over: boolean; remaining: number }) {
    const { money } = useDisplayFormat();
    return (
        <span className={`dash-figure text-[13px] font-medium ${over ? "text-app-spend" : "text-app-income"}`}>
            {money(remaining, currency)}
        </span>
    );
}

export function Categories() {
    const copy = useIntlayer("dashboard-categories");
    const presets = useIntlayer("category-presets");
    const { dbClient } = useRouteContext({ from: "__root__" });
    const { filters, ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const meta = useMeta();
    const writes = useCategoryWrites();
    const [income, setIncome] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [editing, setEditing] = useState<EditorTarget | null>(null);

    const { period } = filters;
    const rows = ledger.books.categories;
    const tree = useMemo(() => categoryTree(rows, income), [rows, income]);
    const counts = useMemo(
        () =>
            [false, true].map((side) =>
                categoryTree(rows, side).reduce((sum, node) => sum + 1 + node.children.length, 0)
            ),
        [rows]
    );
    const lines = useMemo(() => categoryLines(ledger, income, period), [ledger, income, period]);
    const budgets = useMemo(() => categoryBudgets(ledger, period), [ledger, period]);
    const showSuggestions = metaFlag(meta, "categorySuggestions", true);
    const atExpenseCap = !income && liveCategories(rows).filter((row) => !row.income).length >= MAX_EXPENSE_CATEGORIES;
    const labelOf = (name: string) => presets[presetKey(name)]?.value ?? name;
    const suggestions = suggestionsNotAdded(
        income,
        rows.filter((row) => row.deletedAt === null && row.income === income),
        labelOf
    );
    const children = tree.reduce((sum, node) => sum + node.children.length, 0);
    const entries = tree.reduce((sum, node) => sum + (lines.get(node.localId)?.entries ?? 0), 0);
    const spent = tree.reduce((sum, node) => sum + (lines.get(node.localId)?.spent ?? 0), 0);

    const tabs = (
        <Choice
            label={copy.type.value}
            onChange={(side) => setIncome(side === "income")}
            options={(["expense", "income"] as const).map((side, index) => ({
                label: (
                    <>
                        {copy[side]} <span className="dash-figure text-muted-foreground ml-1">{counts[index]}</span>
                    </>
                ),
                value: side,
            }))}
            value={income ? "income" : "expense"}
        />
    );

    if (reordering) {
        return (
            <>
                <SectionHead
                    action={
                        <Button onClick={() => setReordering(false)} size="sm">
                            {copy.done}
                        </Button>
                    }
                    title={copy.reorderTitle}
                />
                <TabbedCard tabs={tabs}>
                    <ReorderList tree={tree} />
                </TabbedCard>
            </>
        );
    }

    const lineCells = (row: Category) => {
        const line = lines.get(row.localId);
        const budget = budgets.get(row.localId);
        return (
            <>
                <Table.Cell align="end" className={FIGURE}>
                    {line?.entries ?? 0}
                </Table.Cell>
                <Table.Cell align="end" className={`${CELL} dash-figure text-sm font-medium`}>
                    {money(line?.spent ?? 0, ledger.currency)}
                </Table.Cell>
                <Table.Cell align="end" className={FIGURE}>
                    {budget ? money(budget.limit, ledger.currency) : null}
                </Table.Cell>
                <Table.Cell align="end" className={CELL}>
                    {budget ? (
                        <Left currency={ledger.currency} over={budget.overBudget} remaining={budget.remaining} />
                    ) : null}
                </Table.Cell>
            </>
        );
    };

    return (
        <>
            <SectionHead
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            aria-pressed={showSuggestions}
                            className="max-sm:hidden"
                            onClick={() => writeSettings(dbClient, { categorySuggestions: String(!showSuggestions) })}
                            size="sm"
                            variant="outline"
                        >
                            <RiLightbulbLine size={16} />
                            {copy.suggestions}
                        </Button>
                        <Button onClick={() => setReordering(true)} size="sm" variant="outline">
                            <RiDraggable size={16} />
                            <span className="max-sm:sr-only">{copy.reorder}</span>
                        </Button>
                        <Button onClick={() => setEditing({ income, parentId: null })} size="sm">
                            <RiAddLine size={16} />
                            <span className="max-sm:sr-only">{copy.newCategory}</span>
                        </Button>
                    </div>
                }
                title={copy.title}
            />
            <div className="flex flex-col gap-4">
                <TabbedCard
                    footer={
                        <div className="flex w-full flex-wrap justify-between gap-x-4 gap-y-1">
                            <span>{copy.census({ categories: tree.length, subcategories: children })}</span>
                            <span>
                                {copy.entries} <span className="dash-figure">{entries}</span> ·{" "}
                                <span className="dash-figure">{money(spent, ledger.currency)}</span>
                            </span>
                        </div>
                    }
                    tabs={tabs}
                >
                    {tree.length === 0 ? (
                        <p className="text-muted-foreground px-5 py-8 text-center text-sm">{copy.emptyTitle}</p>
                    ) : (
                        <Table
                            aria-label={copy.title.value}
                            containerClassName={`overflow-clip ${PHONE_COLUMNS}`}
                            maxHeight="none"
                            striped
                        >
                            <Table.Header className="in-data-[sticky]:bg-card">
                                <Table.Row>
                                    <Table.Head className={HEAD}>{copy.category}</Table.Head>
                                    <Table.Head align="end" className={HEAD}>
                                        {copy.entries}
                                    </Table.Head>
                                    <Table.Head align="end" className={HEAD}>
                                        {date.month(period.key)}
                                    </Table.Head>
                                    <Table.Head align="end" className={HEAD}>
                                        {copy.budget}
                                    </Table.Head>
                                    <Table.Head align="end" className={HEAD}>
                                        {copy.left}
                                    </Table.Head>
                                    <Table.Head className={`${HEAD} w-10`} />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {tree.flatMap((node) => [
                                    <Table.Row key={node.localId}>
                                        <Table.Cell className={CELL}>
                                            <Link
                                                className="flex min-w-0 items-center gap-2.5 font-medium"
                                                params={{ categoryId: node.localId }}
                                                to="/app/settings/categories/$categoryId"
                                            >
                                                <LookTile look={node} size="lg" />
                                                <span className="truncate">{node.name}</span>
                                            </Link>
                                        </Table.Cell>
                                        {lineCells(node)}
                                        <Table.Cell align="end" className={CELL}>
                                            <RowActions
                                                onEdit={() => setEditing({ doc: node })}
                                                onSubcategory={() =>
                                                    setEditing({ income: node.income, parentId: node.localId })
                                                }
                                                row={node}
                                            />
                                        </Table.Cell>
                                    </Table.Row>,
                                    ...node.children.map((child) => (
                                        <Table.Row key={child.localId}>
                                            <Table.Cell className={CELL}>
                                                <Link
                                                    className="flex min-w-0 items-center gap-2.5 pl-8"
                                                    params={{ categoryId: child.localId }}
                                                    to="/app/settings/categories/$categoryId"
                                                >
                                                    <LookTile look={child} />
                                                    <span className="truncate">{child.name}</span>
                                                </Link>
                                            </Table.Cell>
                                            {lineCells(child)}
                                            <Table.Cell align="end" className={CELL}>
                                                <RowActions onEdit={() => setEditing({ doc: child })} row={child} />
                                            </Table.Cell>
                                        </Table.Row>
                                    )),
                                ])}
                            </Table.Body>
                        </Table>
                    )}
                </TabbedCard>
                {showSuggestions && suggestions.length > 0 && !atExpenseCap ? (
                    <CardFrame
                        action={
                            <span className="dash-figure text-muted-foreground text-[13px]">{suggestions.length}</span>
                        }
                        title={copy.suggested}
                    >
                        <div className="flex flex-wrap gap-2 p-4">
                            {suggestions.map((preset) => (
                                <Button
                                    key={preset.name}
                                    onClick={() =>
                                        writes.add({
                                            color: income ? INCOME_COLOR : preset.color,
                                            emoji: null,
                                            icon: preset.icon,
                                            income,
                                            name: labelOf(preset.name),
                                            parentId: null,
                                            preset: preset.name,
                                        })
                                    }
                                    size="sm"
                                    variant="outline"
                                >
                                    <RiAddLine size={16} />
                                    {labelOf(preset.name)}
                                </Button>
                            ))}
                        </div>
                    </CardFrame>
                ) : null}
            </div>
            {editing ? <CategoryEditor onClose={() => setEditing(null)} target={editing} /> : null}
        </>
    );
}
