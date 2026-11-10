import type { MmChoices, StartChoice } from "@outlayr/money/money-manager/types";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import { Cell, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile } from "@/components/ledger/tiles";
import { money } from "@/lib/ledger";

import { Card, Columns, ImportPage } from "../parts";
import { accountOf, fill, spentThisMonth, targetName } from "./model";
import type { Draft } from "./model";
import { MmBar, RadioLine } from "./parts";

const PAIR_ROWS = 8;

interface Props {
    draft: Draft;
    onBack: () => void;
    onChoices: (choices: MmChoices) => void;
}

export function Uncategorized({ draft, onBack, onChoices }: Props) {
    const { uncategorized: copy } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const { analysis, choices } = draft;
    const { pairs } = analysis.uncategorized;
    const total = analysis.uncategorized.expense + analysis.uncategorized.income;
    const rest = total - pairs.length * 2;
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title} />
            <div className="flex flex-col gap-4">
                {pairs.length > 0 ? (
                    <Card
                        action={
                            <label className="flex items-center gap-2 text-[13px]">
                                <Checkbox
                                    checked={choices.pairsAsTransfers}
                                    onCheckedChange={(next) =>
                                        onChoices({ ...choices, pairsAsTransfers: next === true })
                                    }
                                />
                                {copy.makeTransfers}
                            </label>
                        }
                        title={fill(copy.pairs.value, { n: pairs.length })}
                    >
                        <DataTable head={[copy.date, copy.from, copy.to, copy.amount]}>
                            {pairs.slice(0, PAIR_ROWS).map((pair) => (
                                <Table.Row key={pair.outUid}>
                                    <Cell>{date.day(pair.day)}</Cell>
                                    <Cell>{accountOf(draft, pair.fromAccountUid)?.title}</Cell>
                                    <Cell>{accountOf(draft, pair.toAccountUid)?.title}</Cell>
                                    <Cell figure>{money(pair.amount, pair.currency)}</Cell>
                                </Table.Row>
                            ))}
                        </DataTable>
                        {pairs.length > PAIR_ROWS ? (
                            <p className="text-muted-foreground px-4 py-3 text-[13px]">
                                {fill(copy.more.value, { n: pairs.length - PAIR_ROWS })}
                            </p>
                        ) : null}
                    </Card>
                ) : null}
                {rest > 0 || pairs.length === 0 ? (
                    <Card title={pairs.length > 0 ? fill(copy.rest.value, { n: rest }) : copy.title}>
                        <RadioLine
                            checked={choices.uncategorized === "leave"}
                            hint={copy.leaveHint}
                            onSelect={() => onChoices({ ...choices, uncategorized: "leave" })}
                        >
                            {copy.leave}
                        </RadioLine>
                        <RadioLine
                            checked={choices.uncategorized === "other"}
                            hint={copy.otherHint}
                            onSelect={() => onChoices({ ...choices, uncategorized: "other" })}
                        >
                            {copy.other}
                        </RadioLine>
                    </Card>
                ) : null}
            </div>
        </ImportPage>
    );
}

export function Budgets({ draft, onBack, onChoices }: Props) {
    const { budgets: copy } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const { analysis, choices, snapshot } = draft;
    const { ledger } = useDashboard();
    const spent = spentThisMonth(draft, ledger.today);
    const rows = analysis.categories.filter(
        (view) => view.limit !== null && choices.categories[view.uid]?.kind !== "skip"
    );
    const monthKey = ledger.today.slice(0, 7);
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title} />
            <Card footer={<span className="text-muted-foreground">{copy.hint}</span>}>
                <DataTable
                    head={[
                        copy.category,
                        copy.from,
                        fill(copy.spent.value, { month: date.month(monthKey) }),
                        copy.limit,
                        copy.bring,
                    ]}
                    numbers={2}
                >
                    {rows.map((view) => (
                        <Table.Row key={view.uid}>
                            <Cell>
                                <span className="flex items-center gap-2.5">
                                    <LookTile look={{ color: view.color, emoji: null, icon: view.icon }} />
                                    <span className="truncate">
                                        {targetName(draft, view, choices.categories[view.uid]) ?? view.title}
                                    </span>
                                </span>
                            </Cell>
                            <Cell>{view.title}</Cell>
                            <Cell figure>{money(spent.get(view.uid) ?? 0, snapshot.defaultCurrency)}</Cell>
                            <Cell figure>{money(view.limit ?? 0, snapshot.defaultCurrency)}</Cell>
                            <Cell>
                                <Checkbox
                                    aria-label={copy.bring.value}
                                    checked={choices.budgets[view.uid] === true}
                                    onCheckedChange={(next) =>
                                        onChoices({
                                            ...choices,
                                            budgets: { ...choices.budgets, [view.uid]: next === true },
                                        })
                                    }
                                />
                            </Cell>
                        </Table.Row>
                    ))}
                </DataTable>
            </Card>
        </ImportPage>
    );
}

export function Balances({ draft, onBack, onChoices }: Props) {
    const { balances: copy } = useIntlayer("dashboard-import-mm");
    const { analysis, choices } = draft;
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title} />
            <Card footer={<span className="text-muted-foreground">{copy.note}</span>}>
                <DataTable head={[copy.account, copy.shows, copy.adds, copy.off, copy.match]} numbers={3}>
                    {analysis.balanceGaps.map((gap) => {
                        const view = accountOf(draft, gap.accountUid);
                        return (
                            <Table.Row key={gap.accountUid}>
                                <Cell>
                                    <span className="flex items-center gap-2.5">
                                        {view ? (
                                            <LookTile look={{ color: view.color, emoji: null, icon: view.icon }} />
                                        ) : null}
                                        <span className="truncate">{view?.title}</span>
                                    </span>
                                </Cell>
                                <Cell figure>{money(gap.stored, gap.currency)}</Cell>
                                <Cell figure>{money(gap.computed, gap.currency)}</Cell>
                                <Cell figure>{money(gap.stored - gap.computed, gap.currency, "always")}</Cell>
                                <Cell>
                                    <Checkbox
                                        aria-label={copy.match.value}
                                        checked={choices.matchBalances[gap.accountUid] === true}
                                        onCheckedChange={(next) =>
                                            onChoices({
                                                ...choices,
                                                matchBalances: {
                                                    ...choices.matchBalances,
                                                    [gap.accountUid]: next === true,
                                                },
                                            })
                                        }
                                    />
                                </Cell>
                            </Table.Row>
                        );
                    })}
                </DataTable>
            </Card>
        </ImportPage>
    );
}

export function Start({ draft, onChoices, onDone }: Omit<Props, "onBack"> & { onDone: () => void }) {
    const { bar, start: copy } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const { overlap } = draft.analysis;
    if (overlap === null) {
        return null;
    }
    const day = date.full(overlap.outlayrFirstDay);
    const { kind } = draft.choices.start;
    const choose = (start: StartChoice) => onChoices({ ...draft.choices, start });
    return (
        <ImportPage>
            <MmBar onBack={onDone} title={copy.title}>
                <Button onClick={onDone} size="sm">
                    {bar.done}
                </Button>
            </MmBar>
            <Columns
                rail={
                    <>
                        <Card title={copy.both.value.replace("{day}", day)}>
                            <ul className="divide-border divide-y text-sm">
                                <li className="flex justify-between px-4 py-2.5">
                                    <span>{copy.inMm}</span>
                                    <b className="dash-figure font-medium">
                                        {fill(copy.entries.value, { n: overlap.mmEntries })}
                                    </b>
                                </li>
                                <li className="flex justify-between px-4 py-2.5">
                                    <span>{copy.inOutlayr}</span>
                                    <b className="dash-figure font-medium">
                                        {fill(copy.entries.value, { n: overlap.outlayrEntries })}
                                    </b>
                                </li>
                                <li className="flex justify-between px-4 py-2.5">
                                    <span>{copy.same}</span>
                                    <b className="dash-figure font-medium">{overlap.matches}</b>
                                </li>
                            </ul>
                        </Card>
                        <Card title={copy.why}>
                            <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">{copy.whyBody}</p>
                        </Card>
                    </>
                }
            >
                <Card title={copy.question}>
                    <RadioLine
                        checked={kind === "cutoff"}
                        hint={copy.cutoffHint}
                        onSelect={() => choose({ kind: "cutoff" })}
                    >
                        {fill(copy.cutoff.value, { day })}
                    </RadioLine>
                    <RadioLine
                        checked={kind === "skipMatches"}
                        hint={fill(copy.skipHint.value, { n: overlap.matches })}
                        onSelect={() => choose({ kind: "skipMatches" })}
                    >
                        {copy.skip}
                    </RadioLine>
                    <RadioLine checked={kind === "all"} hint={copy.allHint} onSelect={() => choose({ kind: "all" })}>
                        {copy.all}
                    </RadioLine>
                </Card>
            </Columns>
        </ImportPage>
    );
}
