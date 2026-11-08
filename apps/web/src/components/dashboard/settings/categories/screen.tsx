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
import { Menu } from "panelui-web/menu";
import { Tabs } from "panelui-web/tabs";
import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { BALANCE, Card, Head, MUTED, TD, Table } from "@/components/dashboard/accounts/accounts-screen";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile } from "@/components/ledger/tiles";
import { categoryBudgets } from "@/lib/dashboard-series";
import { metaFlag, useDisplayFormat, useMeta, writeSettings } from "@/lib/ledger-settings";

import { SectionHead } from "../parts";
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

const OB = "dash-ob h-9 gap-1.5 rounded-[10px] px-3 [&>svg]:size-4";
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
                className="text-muted-foreground hover:text-foreground -mr-1 inline-flex size-7 items-center justify-center rounded-lg"
            >
                <RiMore2Fill size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell dash-menu ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item
                    className="dash-menu-item"
                    onClick={() =>
                        navigate({ params: { categoryId: row.localId }, to: "/app/settings/categories/$categoryId" })
                    }
                >
                    <RiArrowRightUpLine size={16} />
                    {copy.open}
                </Menu.Item>
                <Menu.Item className="dash-menu-item" onClick={onEdit}>
                    <RiPencilLine size={16} />
                    {copy.edit}
                </Menu.Item>
                {onSubcategory ? (
                    <Menu.Item className="dash-menu-item" onClick={onSubcategory}>
                        <RiAddLine size={16} />
                        {copy.addSubcategory}
                    </Menu.Item>
                ) : null}
                <div className="dash-menu-rule" />
                <Menu.Item
                    className="dash-menu-item text-app-spend [&>svg]:text-app-spend!"
                    onClick={() => writes.remove(row.localId)}
                >
                    <RiDeleteBin6Line size={16} />
                    {copy.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
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
        <Tabs onValueChange={(value) => setIncome(value === "income")} value={income ? "income" : "expense"}>
            <Tabs.List className="bg-background/40 rounded-[9px] p-0.5">
                {(["expense", "income"] as const).map((side, index) => (
                    <Tabs.Trigger className="h-[26px] rounded-[7px] px-2.5 text-[13px]" key={side} value={side}>
                        {copy[side]} <span className="dash-figure text-muted-foreground ml-1">{counts[index]}</span>
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
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
                <Card>
                    <div className="dash-card-head">{tabs}</div>
                    <ReorderList tree={tree} />
                </Card>
            </>
        );
    }

    const lineCells = (row: Category) => {
        const line = lines.get(row.localId);
        const budget = budgets.get(row.localId);
        return (
            <>
                <td className={`${TD} dash-figure text-muted-foreground text-right`}>{line?.entries ?? 0}</td>
                <td className={`${TD} ${BALANCE}`}>{money(line?.spent ?? 0, ledger.currency)}</td>
                <td className={`${TD} dash-figure text-muted-foreground text-right`} style={{ color: MUTED }}>
                    {budget ? money(budget.limit, ledger.currency) : null}
                </td>
                <td className={`${TD} text-right`}>
                    {budget ? (
                        <Left currency={ledger.currency} over={budget.overBudget} remaining={budget.remaining} />
                    ) : null}
                </td>
            </>
        );
    };

    return (
        <>
            <SectionHead
                action={
                    <div className="flex items-center gap-2">
                        <button
                            aria-pressed={showSuggestions}
                            className={`${OB} max-sm:hidden`}
                            onClick={() => writeSettings(dbClient, { categorySuggestions: String(!showSuggestions) })}
                            type="button"
                        >
                            <RiLightbulbLine />
                            {copy.suggestions}
                        </button>
                        <button className={OB} onClick={() => setReordering(true)} type="button">
                            <RiDraggable />
                            <span className="max-sm:sr-only">{copy.reorder}</span>
                        </button>
                        <Button onClick={() => setEditing({ income, parentId: null })} size="sm">
                            <RiAddLine size={16} />
                            <span className="max-sm:sr-only">{copy.newCategory}</span>
                        </Button>
                    </div>
                }
                title={copy.title}
            />
            <div className="flex flex-col gap-4">
                <Card>
                    <div className="dash-card-head">{tabs}</div>
                    {tree.length === 0 ? (
                        <p className="text-muted-foreground border-t px-5 py-8 text-center text-sm">
                            {copy.emptyTitle}
                        </p>
                    ) : (
                        <div className={PHONE_COLUMNS}>
                            <Table
                                head={[copy.category, copy.entries, date.month(period.key), copy.budget, copy.left, ""]}
                                numbers={4}
                            >
                                {tree.flatMap((node) => [
                                    <tr key={node.localId}>
                                        <td className={TD}>
                                            <Link
                                                className="flex min-w-0 items-center gap-2.5 font-medium"
                                                params={{ categoryId: node.localId }}
                                                to="/app/settings/categories/$categoryId"
                                            >
                                                <LookTile look={node} size="lg" />
                                                <span className="truncate">{node.name}</span>
                                            </Link>
                                        </td>
                                        {lineCells(node)}
                                        <td className={`${TD} w-10 text-right`}>
                                            <RowActions
                                                onEdit={() => setEditing({ doc: node })}
                                                onSubcategory={() =>
                                                    setEditing({ income: node.income, parentId: node.localId })
                                                }
                                                row={node}
                                            />
                                        </td>
                                    </tr>,
                                    ...node.children.map((child) => (
                                        <tr key={child.localId}>
                                            <td className={TD}>
                                                <Link
                                                    className="flex min-w-0 items-center gap-2.5 pl-8"
                                                    params={{ categoryId: child.localId }}
                                                    to="/app/settings/categories/$categoryId"
                                                >
                                                    <LookTile look={child} />
                                                    <span className="truncate">{child.name}</span>
                                                </Link>
                                            </td>
                                            {lineCells(child)}
                                            <td className={`${TD} w-10 text-right`}>
                                                <RowActions onEdit={() => setEditing({ doc: child })} row={child} />
                                            </td>
                                        </tr>
                                    )),
                                ])}
                            </Table>
                        </div>
                    )}
                    <div className="dash-card-foot flex flex-wrap justify-between gap-x-4 gap-y-1 pr-5 max-sm:py-2">
                        <span>{copy.census({ categories: tree.length, subcategories: children })}</span>
                        <span>
                            {copy.entries} <span className="dash-figure">{entries}</span> ·{" "}
                            <span className="dash-figure">{money(spent, ledger.currency)}</span>
                        </span>
                    </div>
                </Card>
                {showSuggestions && suggestions.length > 0 && !atExpenseCap ? (
                    <Card>
                        <Head count={suggestions.length} title={copy.suggested} />
                        <div className="flex flex-wrap gap-2 px-5 pb-5">
                            {suggestions.map((preset) => (
                                <button
                                    className={OB}
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
                                    type="button"
                                >
                                    <RiAddLine />
                                    {labelOf(preset.name)}
                                </button>
                            ))}
                        </div>
                    </Card>
                ) : null}
            </div>
            {editing ? <CategoryEditor onClose={() => setEditing(null)} target={editing} /> : null}
        </>
    );
}
