import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { suggestionsNotAdded } from "@outlayr/money/category-rules";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile } from "@/components/ledger/tiles";
import { liveCategories } from "@/lib/category-writes";
import { categoryBudgets } from "@/lib/dashboard-series";
import { metaFlag, useDisplayFormat, useMeta } from "@/lib/ledger-settings";

import { SectionHead, SettingsCard, useSaveSettings } from "../parts";
import { CategoryEditor } from "./editor";
import type { EditorTarget } from "./editor";
import { categoryLines, categoryTree, INCOME_COLOR, MAX_EXPENSE_CATEGORIES } from "./model";
import type { Category } from "./model";
import { usePresetLabel } from "./preset-label";
import { ReorderList } from "./reorder";
import { useCategoryWrites } from "./write";

const CELL = "whitespace-nowrap";
const FIGURE = `${CELL} dash-figure text-muted-foreground`;
const PHONE_COLUMNS = "max-sm:[&_tr>*:nth-child(2)]:hidden max-sm:[&_tr>*:nth-child(4)]:hidden";

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
                <HugeiconsIcon icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item
                    onClick={() =>
                        navigate({ params: { categoryId: row.localId }, to: "/settings/categories/$categoryId" })
                    }
                >
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
                    {copy.open}
                </Menu.Item>
                <Menu.Item onClick={onEdit}>
                    <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                    {copy.edit}
                </Menu.Item>
                {onSubcategory ? (
                    <Menu.Item onClick={onSubcategory}>
                        <HugeiconsIcon icon={PlusSignIcon} size={16} />
                        {copy.addSubcategory}
                    </Menu.Item>
                ) : null}
                <Menu.Separator />
                <Menu.Item onClick={() => writes.remove(row.localId)} variant="destructive">
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                    {copy.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

function TabbedCard({ children, footer, tabs }: { children: ReactNode; footer?: ReactNode; tabs: ReactNode }) {
    return (
        <Frame className="min-w-0">
            <Frame.Header>{tabs}</Frame.Header>
            <Frame.Panel>{children}</Frame.Panel>
            {footer ? <Frame.Footer className="flex-wrap text-sm">{footer}</Frame.Footer> : null}
        </Frame>
    );
}

function Left({ remaining, over, currency }: { currency: string; over: boolean; remaining: number }) {
    const { money } = useDisplayFormat();
    return (
        <Badge className="dash-figure" variant={over ? "destructive" : "success"}>
            {money(remaining, currency)}
        </Badge>
    );
}

export function Categories() {
    const copy = useIntlayer("dashboard-categories");
    const labelOf = usePresetLabel();
    const save = useSaveSettings();
    const { filters, ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const meta = useMeta();
    const writes = useCategoryWrites();
    const [income, setIncome] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [editing, setEditing] = useState<EditorTarget | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const edit = (target: EditorTarget) => {
        setEditing(target);
        setEditorOpen(true);
    };

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
    const suggestions = suggestionsNotAdded(
        income,
        rows.filter((row) => row.deletedAt === null && row.income === income),
        labelOf
    );
    const children = tree.reduce((sum, node) => sum + node.children.length, 0);
    const entries = tree.reduce((sum, node) => sum + (lines.get(node.localId)?.entries ?? 0), 0);
    const spent = tree.reduce((sum, node) => sum + (lines.get(node.localId)?.spent ?? 0), 0);

    const tabs = (
        <Tabs
            onValueChange={(side) => setIncome(side === "income")}
            value={income ? "income" : "expense"}
            variant="underline"
        >
            <Tabs.List aria-label={copy.type.value}>
                {(["expense", "income"] as const).map((side, index) => (
                    <Tabs.Trigger key={side} value={side}>
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
                            onClick={() => save({ categorySuggestions: String(!showSuggestions) })}
                            size="sm"
                            variant="outline"
                        >
                            <HugeiconsIcon icon={Idea01Icon} size={16} />
                            {copy.suggestions}
                        </Button>
                        <Button onClick={() => setReordering(true)} size="sm" variant="outline">
                            <HugeiconsIcon icon={DragDropVerticalIcon} size={16} />
                            <span className="max-sm:sr-only">{copy.reorder}</span>
                        </Button>
                        <Button onClick={() => edit({ income, parentId: null })} size="sm">
                            <HugeiconsIcon icon={PlusSignIcon} size={16} />
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
                        <Table framed aria-label={copy.title.value} containerClassName={PHONE_COLUMNS} maxHeight="none">
                            <Table.Header className="in-data-[sticky]:bg-card">
                                <Table.Row>
                                    <Table.Head>{copy.category}</Table.Head>
                                    <Table.Head align="end">{copy.entries}</Table.Head>
                                    <Table.Head align="end">{date.month(period.key)}</Table.Head>
                                    <Table.Head align="end">{copy.budget}</Table.Head>
                                    <Table.Head align="end">{copy.left}</Table.Head>
                                    <Table.Head className="w-10" />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {tree.flatMap((node) => [
                                    <Table.Row key={node.localId}>
                                        <Table.Cell className={CELL}>
                                            <Link
                                                className="flex min-w-0 items-center gap-2.5 font-medium"
                                                params={{ categoryId: node.localId }}
                                                to="/settings/categories/$categoryId"
                                            >
                                                <LookTile look={node} size="lg" />
                                                <span className="truncate">{node.name}</span>
                                            </Link>
                                        </Table.Cell>
                                        {lineCells(node)}
                                        <Table.Cell align="end" className={CELL}>
                                            <RowActions
                                                onEdit={() => edit({ doc: node })}
                                                onSubcategory={() =>
                                                    edit({ income: node.income, parentId: node.localId })
                                                }
                                                row={node}
                                            />
                                        </Table.Cell>
                                    </Table.Row>,
                                    ...node.children.map((child) => (
                                        <Table.Row key={child.localId}>
                                            <Table.Cell className={CELL}>
                                                <Link
                                                    className="before:border-border relative flex min-w-0 items-center gap-2.5 pl-8 before:absolute before:top-[-9px] before:left-3.5 before:h-[22px] before:w-3.5 before:rounded-bl-md before:border-b before:border-l"
                                                    params={{ categoryId: child.localId }}
                                                    to="/settings/categories/$categoryId"
                                                >
                                                    <LookTile look={child} />
                                                    <span className="truncate">{child.name}</span>
                                                </Link>
                                            </Table.Cell>
                                            {lineCells(child)}
                                            <Table.Cell align="end" className={CELL}>
                                                <RowActions onEdit={() => edit({ doc: child })} row={child} />
                                            </Table.Cell>
                                        </Table.Row>
                                    )),
                                ])}
                            </Table.Body>
                        </Table>
                    )}
                </TabbedCard>
                {showSuggestions && suggestions.length > 0 && !atExpenseCap ? (
                    <SettingsCard
                        action={
                            <span className="dash-figure text-muted-foreground text-[13px]">{suggestions.length}</span>
                        }
                        title={copy.suggested}
                    >
                        <div className="flex flex-wrap gap-2 p-4">
                            {suggestions.map((preset) => (
                                <Chip
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
                                >
                                    <HugeiconsIcon icon={PlusSignIcon} size={14} />
                                    {labelOf(preset.name)}
                                </Chip>
                            ))}
                        </div>
                    </SettingsCard>
                ) : null}
            </div>
            <CategoryEditor onClose={() => setEditorOpen(false)} open={editorOpen} target={editing} />
        </>
    );
}
