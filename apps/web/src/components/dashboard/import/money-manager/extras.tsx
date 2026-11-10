import type { MmChoices, StartChoice } from "@outlayr/money/money-manager/types";
import { Button } from "panelui-web/button";
import { Switch } from "panelui-web/switch";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import { Cell, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
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
    const { bar, uncategorized: copy } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const { analysis, choices } = draft;
    const { pairs } = analysis.uncategorized;
    const total = analysis.uncategorized.expense + analysis.uncategorized.income;
    const rest = total - pairs.length * 2;
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title}>
                <span className="text-muted-foreground text-[13px]">
                    {fill(copy.subtitle.value, {
                        expense: analysis.uncategorized.expense.toLocaleString(),
                        income: analysis.uncategorized.income.toLocaleString(),
                    })}
                </span>
                <Button onClick={onBack}>{bar.done}</Button>
            </MmBar>
            <div className="grid items-start gap-4 @5xl:grid-cols-2">
                {pairs.length > 0 ? (
                    <Card title={fill(copy.pairs.value, { n: pairs.length })}>
                        <RadioLine
                            checked={choices.pairsAsTransfers}
                            hint={copy.pairsHint}
                            name="mm-pairs"
                            onSelect={() => onChoices({ ...choices, pairsAsTransfers: true })}
                        >
                            {copy.makeTransfers}
                        </RadioLine>
                        <RadioLine
                            checked={!choices.pairsAsTransfers}
                            name="mm-pairs"
                            onSelect={() => onChoices({ ...choices, pairsAsTransfers: false })}
                        >
                            {copy.treatAlike}
                        </RadioLine>
                        <DataTable head={[copy.date, copy.from, copy.to, copy.amount]} numbers={0}>
                            {pairs.slice(0, PAIR_ROWS).map((pair) => (
                                <Table.Row key={pair.outUid}>
                                    <Cell>{date.full(pair.day)}</Cell>
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
                    <Card title={pairs.length > 0 ? fill(copy.rest.value, { n: rest.toLocaleString() }) : copy.title}>
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
    const { bar, budgets: copy } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const { analysis, choices, snapshot } = draft;
    const { whole } = useWholeMoney(snapshot.defaultCurrency);
    const { ledger } = useDashboard();
    const spent = spentThisMonth(draft, ledger.today);
    const rows = analysis.categories.filter(
        (view) => view.limit !== null && choices.categories[view.uid]?.kind !== "skip"
    );
    const monthKey = ledger.today.slice(0, 7);
    const brought = rows.filter((view) => choices.budgets[view.uid] === true);
    const broughtTotal = brought.reduce((sum, view) => sum + (view.limit ?? 0), 0);
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title}>
                <Button onClick={onBack}>{bar.done}</Button>
            </MmBar>
            <Card
                action={<span className="text-muted-foreground text-xs">{copy.hint}</span>}
                footer={
                    <span className="text-muted-foreground">
                        {fill(copy.total.value, { amount: whole(broughtTotal), n: brought.length })}
                    </span>
                }
                title={copy.fromLimits}
            >
                <DataTable
                    head={[
                        copy.category,
                        copy.from,
                        fill(copy.spent.value, { month: date.month(monthKey) }),
                        copy.used,
                        copy.limit,
                        copy.bring,
                    ]}
                    numbers={2}
                >
                    {rows.map((view) => {
                        const used = spent.get(view.uid) ?? 0;
                        const limit = view.limit ?? 0;
                        return (
                            <Table.Row key={view.uid}>
                                <Cell>
                                    <span className="flex items-center gap-2.5">
                                        <LookTile look={{ color: view.color, emoji: null, icon: view.icon }} />
                                        <span className="truncate">
                                            {targetName(draft, view, choices.categories[view.uid]) ?? view.title}
                                        </span>
                                    </span>
                                </Cell>
                                <Cell>
                                    <span className="text-muted-foreground">
                                        {fill(copy.fromName.value, { name: view.title })}
                                    </span>
                                </Cell>
                                <Cell>
                                    <span aria-hidden className="bg-app-fill block h-1.5 w-40 rounded-full">
                                        <span
                                            className={`block h-full rounded-full ${used > limit ? "bg-app-warn" : "bg-primary"}`}
                                            style={{ width: `${limit > 0 ? Math.min(100, (used / limit) * 100) : 0}%` }}
                                        />
                                    </span>
                                </Cell>
                                <Cell figure>{whole(used)}</Cell>
                                <Cell figure>{whole(limit)}</Cell>
                                <Cell>
                                    <Switch
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
                        );
                    })}
                </DataTable>
            </Card>
        </ImportPage>
    );
}

export function Balances({ draft, onBack, onChoices }: Props) {
    const { balances: copy, bar } = useIntlayer("dashboard-import-mm");
    const { analysis, choices } = draft;
    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title}>
                <Button onClick={onBack}>{bar.done}</Button>
            </MmBar>
            <Card
                footer={<span className="text-muted-foreground">{copy.note}</span>}
                title={fill(copy.summaryOff.value, { n: analysis.balanceGaps.length })}
            >
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
                                    <Switch
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
                                        {fill(copy.entries.value, { n: overlap.mmEntries.toLocaleString() })}
                                    </b>
                                </li>
                                <li className="flex justify-between px-4 py-2.5">
                                    <span>{copy.inOutlayr}</span>
                                    <b className="dash-figure font-medium">
                                        {fill(copy.entries.value, { n: overlap.outlayrEntries.toLocaleString() })}
                                    </b>
                                </li>
                                <li className="flex justify-between px-4 py-2.5">
                                    <span>{copy.same}</span>
                                    <b className="dash-figure font-medium">{overlap.matches.toLocaleString()}</b>
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
                        hint={fill(copy.skipHint.value, { n: overlap.matches.toLocaleString() })}
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
