import { defaultChoices } from "@outlayr/money/money-manager/defaults";
import type { CategoryTarget, MmCategoryView, MmChoices } from "@outlayr/money/money-manager/types";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { Cell, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { LookTile } from "@/components/ledger/tiles";

import { Card, ImportPage } from "../parts";
import { parentName, targetName } from "./model";
import type { Draft } from "./model";
import { MmBar, Pick } from "./parts";
import type { PickGroup } from "./parts";

interface Props {
    draft: Draft;
    onBack: () => void;
    onChoices: (choices: MmChoices) => void;
}

export function Categories({ draft, onBack, onChoices }: Props) {
    const { bar, categories: copy } = useIntlayer("dashboard-import-mm");
    const [tab, setTab] = useState<"expenses" | "income">("expenses");
    const { analysis, choices, ledger, snapshot } = draft;

    const switchMode = (categoryMode: MmChoices["categoryMode"]) => {
        if (categoryMode === choices.categoryMode) {
            return;
        }
        const fresh = defaultChoices(snapshot, analysis, ledger, categoryMode);
        onChoices({ ...choices, budgets: fresh.budgets, categories: fresh.categories, categoryMode });
    };

    const howOf = (view: MmCategoryView) => {
        const target = choices.categories[view.uid];
        switch (target?.kind) {
            case "existing":
            case "preset": {
                return copy.matched.value;
            }
            case "sub": {
                return copy.inParent.value.replace("{parent}", parentName(draft, target.parent));
            }
            case "new": {
                return copy.newTag.value;
            }
            default: {
                return view.entryCount === 0 ? copy.noEntries.value : copy.left.value;
            }
        }
    };

    const groupsFor = (view: MmCategoryView): PickGroup[] => {
        const target = choices.categories[view.uid];
        const set = (next: CategoryTarget) =>
            onChoices({ ...choices, categories: { ...choices.categories, [view.uid]: next } });
        const existing = ledger.categories.filter((category) => category.income === view.income && !category.parentId);
        return [
            {
                options: [
                    {
                        current: target?.kind === "new",
                        key: "new",
                        label: copy.newCategory,
                        onPick: () => set({ kind: "new" }),
                    },
                    {
                        current: target?.kind === "skip",
                        key: "skip",
                        label: copy.leave,
                        onPick: () => set({ kind: "skip" }),
                    },
                ],
                title: copy.putIn,
            },
            {
                options: existing.map((category) => ({
                    current: target?.kind === "existing" && target.categoryId === category.id,
                    key: category.id,
                    label: category.name,
                    onPick: () => set({ categoryId: category.id, kind: "existing" }),
                })),
                title: copy.other,
            },
        ];
    };

    const expenseRows = analysis.categories.filter((view) => !view.income);
    const incomeRows = analysis.categories.filter((view) => view.income);
    const shown = tab === "income" && incomeRows.length > 0 ? "income" : "expenses";
    const rows = shown === "income" ? incomeRows : expenseRows;
    const tabs = (
        <div className="flex min-w-0 flex-1 items-center gap-3">
            <Tabs
                className="min-w-0 flex-1"
                onValueChange={(value) => setTab(value === "income" ? "income" : "expenses")}
                value={shown}
                variant="underline"
            >
                <Tabs.List aria-label={copy.title.value}>
                    <Tabs.Trigger value="expenses">
                        {copy.expenses}
                        <Tabs.Badge className="dash-figure text-muted-foreground bg-transparent! px-0">
                            {expenseRows.length}
                        </Tabs.Badge>
                    </Tabs.Trigger>
                    {incomeRows.length > 0 ? (
                        <Tabs.Trigger value="income">
                            {copy.income}
                            <Tabs.Badge className="dash-figure text-muted-foreground bg-transparent! px-0">
                                {incomeRows.length}
                            </Tabs.Badge>
                        </Tabs.Trigger>
                    ) : null}
                </Tabs.List>
            </Tabs>
            <span className="text-muted-foreground text-[13px]">{copy.use}</span>
            <Tabs
                onValueChange={(value) => switchMode(value === "keep" ? "keep" : "match")}
                value={choices.categoryMode}
                variant="segmented"
            >
                <Tabs.List aria-label={copy.use.value}>
                    <Tabs.Trigger value="match">{copy.outlayrs}</Tabs.Trigger>
                    <Tabs.Trigger value="keep">{copy.mine}</Tabs.Trigger>
                </Tabs.List>
            </Tabs>
        </div>
    );

    const kept = Object.values(choices.categories).filter((target) => target.kind !== "skip").length;
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title}>
                <Button onClick={onBack}>{bar.done}</Button>
            </MmBar>
            <Card head={tabs}>
                <DataTable head={[copy.inMm, copy.entries, copy.goesTo, copy.how]} numbers={0}>
                    {rows.map((view) => (
                        <Table.Row key={view.uid}>
                            <Cell>
                                <span className="flex items-center gap-2.5">
                                    <LookTile look={{ color: view.color, emoji: null, icon: view.icon }} />
                                    <span className="truncate">{view.title}</span>
                                </span>
                            </Cell>
                            <Cell figure>{view.entryCount}</Cell>
                            <Cell>
                                <Pick
                                    groups={groupsFor(view)}
                                    label={targetName(draft, view, choices.categories[view.uid]) ?? copy.left}
                                />
                            </Cell>
                            <Cell>{howOf(view)}</Cell>
                        </Table.Row>
                    ))}
                </DataTable>
                <p className="text-muted-foreground flex justify-between gap-4 px-4 py-3 text-[13px] leading-5">
                    <span>{copy.note}</span>
                    <span className="dash-figure flex-none">
                        {copy.count.value
                            .replace("{n}", String(kept))
                            .replace("{total}", String(analysis.categories.length))}
                    </span>
                </p>
            </Card>
        </ImportPage>
    );
}
