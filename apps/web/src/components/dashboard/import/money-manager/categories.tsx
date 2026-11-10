import { defaultChoices } from "@outlayr/money/money-manager/defaults";
import type { CategoryTarget, MmCategoryView, MmChoices } from "@outlayr/money/money-manager/types";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
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
    const { categories: copy } = useIntlayer("dashboard-import-mm");
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

    const section = (income: boolean, title: string) => {
        const rows = analysis.categories.filter((view) => view.income === income);
        return rows.length === 0 ? null : (
            <Card title={title}>
                <DataTable head={[copy.inMm, copy.entries, copy.how, copy.goesTo]}>
                    {rows.map((view) => (
                        <Table.Row key={view.uid}>
                            <Cell>
                                <span className="flex items-center gap-2.5">
                                    <LookTile look={{ color: view.color, emoji: null, icon: view.icon }} />
                                    <span className="truncate">{view.title}</span>
                                </span>
                            </Cell>
                            <Cell figure>{view.entryCount}</Cell>
                            <Cell>{howOf(view)}</Cell>
                            <Cell>
                                <Pick
                                    groups={groupsFor(view)}
                                    label={targetName(draft, view, choices.categories[view.uid]) ?? copy.left}
                                />
                            </Cell>
                        </Table.Row>
                    ))}
                </DataTable>
            </Card>
        );
    };

    const kept = Object.values(choices.categories).filter((target) => target.kind !== "skip").length;
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title}>
                <span className="text-muted-foreground text-[13px]">{copy.use}</span>
                <Button
                    onClick={() => switchMode("match")}
                    size="sm"
                    variant={choices.categoryMode === "match" ? "secondary" : "ghost"}
                >
                    {copy.outlayrs}
                </Button>
                <Button
                    onClick={() => switchMode("keep")}
                    size="sm"
                    variant={choices.categoryMode === "keep" ? "secondary" : "ghost"}
                >
                    {copy.mine}
                </Button>
            </MmBar>
            <div className="flex flex-col gap-4">
                {section(false, copy.expenses.value)}
                {section(true, copy.income.value)}
                <p className="text-muted-foreground text-[13px] leading-5">
                    {copy.count.value
                        .replace("{n}", String(kept))
                        .replace("{total}", String(analysis.categories.length))}
                    {". "}
                    {copy.note}
                </p>
            </div>
        </ImportPage>
    );
}
