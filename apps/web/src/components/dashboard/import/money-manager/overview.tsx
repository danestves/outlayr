import { Button } from "panelui-web/button";
import { useIntlayer } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
import { money } from "@/lib/ledger";

import { Card, Columns, ImportPage } from "../parts";
import { fill, planOf, planSize } from "./model";
import type { Draft, Screen } from "./model";
import { MmBar, NavRow } from "./parts";

const WARN = "text-app-tint";
const BAR_MIN = 4;

interface Props {
    draft: Draft;
    onCancel: () => void;
    onImport: () => void;
    onOpen: (screen: Screen) => void;
}

export function Overview({ draft, onCancel, onImport, onOpen }: Props) {
    const { bar, overview } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const { analysis, choices } = draft;
    const plan = planOf(draft);
    const count = planSize(plan);
    const uncategorized = analysis.uncategorized.expense + analysis.uncategorized.income;
    const [gap] = analysis.balanceGaps;
    const gapAccount = analysis.accounts.find((account) => account.uid === gap?.accountUid);
    const open = analysis.accounts.filter((account) => account.group === "open").length;
    const hidden = analysis.accounts.filter((account) => account.group === "hidden").length;
    const targets = Object.values(choices.categories).filter((target) => target.kind !== "skip");
    const created = targets.filter((target) => target.kind === "new" || target.kind === "sub").length;
    const budgets = Object.values(choices.budgets).filter(Boolean).length;
    const peak = Math.max(1, ...analysis.perYear.map((year) => year.count));
    const start = {
        all: overview.startingAll,
        cutoff: overview.startingCutoff,
        skipMatches: overview.startingSkip,
    }[choices.start.kind];
    const startDetail =
        choices.start.kind === "cutoff" && analysis.overlap
            ? fill(start.value, { day: date.full(analysis.overlap.outlayrFirstDay) })
            : start.value;
    const needsLook = uncategorized > 0 || analysis.uncategorized.pairs.length > 0 || analysis.balanceGaps.length > 0;
    return (
        <ImportPage>
            <MmBar onBack={onCancel} title={bar.title}>
                <Button onClick={onCancel} variant="outline">
                    {bar.cancel}
                </Button>
                <Button disabled={count === 0} onClick={onImport}>
                    {fill(bar.import.value, { n: count.toLocaleString() })}
                </Button>
            </MmBar>
            <Columns
                rail={
                    <>
                        <Card title={overview.comingOver}>
                            <div className="px-4 py-3">
                                <b className="dash-figure block text-2xl leading-8 font-semibold">
                                    {fill(overview.entries.value, { n: count.toLocaleString() })}
                                </b>
                                {analysis.firstDay && analysis.lastDay ? (
                                    <small className="text-muted-foreground text-xs leading-4">
                                        {fill(overview.range.value, {
                                            from: date.full(analysis.firstDay),
                                            to: date.full(analysis.lastDay),
                                        })}
                                    </small>
                                ) : null}
                                <ul className="mt-3 flex flex-col gap-1.5">
                                    {analysis.perYear.map((year) => (
                                        <li className="flex items-center gap-2 text-xs" key={year.year}>
                                            <span className="dash-figure w-9 flex-none">{year.year}</span>
                                            <span
                                                aria-hidden
                                                className="bg-primary h-2 rounded-sm"
                                                style={{ width: `${Math.max(BAR_MIN, (year.count / peak) * 100)}%` }}
                                            />
                                            <span className="dash-figure text-muted-foreground ml-auto">
                                                {year.count.toLocaleString()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                        <Card
                            footer={<span className="text-muted-foreground">{overview.undoBody}</span>}
                            title={overview.leftBehind}
                        >
                            <NavRow detail={analysis.removedEntryCount} title={overview.deletedEntries} />
                            <NavRow detail={analysis.removedAccountCount} title={overview.deletedAccounts} />
                            <NavRow detail={analysis.reminderCount} title={overview.reminders} />
                        </Card>
                    </>
                }
            >
                {needsLook ? (
                    <Card title={overview.needs}>
                        {uncategorized > 0 ? (
                            <NavRow
                                onClick={() => onOpen("uncategorized")}
                                title={fill(overview.noCategory.value, { n: uncategorized.toLocaleString() })}
                                tone={WARN}
                            />
                        ) : null}
                        {analysis.uncategorized.pairs.length > 0 ? (
                            <NavRow
                                onClick={() => onOpen("uncategorized")}
                                title={fill(overview.pairs.value, { n: analysis.uncategorized.pairs.length })}
                                tone={WARN}
                            />
                        ) : null}
                        {gap && analysis.balanceGaps.length === 1 ? (
                            <NavRow
                                detail={fill(overview.offOneDetail.value, {
                                    amount: money(Math.abs(gap.stored - gap.computed), gap.currency),
                                })}
                                onClick={() => onOpen("balances")}
                                title={fill(overview.offOne.value, { name: gapAccount?.title ?? "" })}
                                tone={WARN}
                            />
                        ) : null}
                        {analysis.balanceGaps.length > 1 ? (
                            <NavRow
                                detail={fill(overview.offManyDetail.value, { n: analysis.balanceGaps.length })}
                                onClick={() => onOpen("balances")}
                                title={overview.offMany}
                                tone={WARN}
                            />
                        ) : null}
                    </Card>
                ) : null}
                <Card title={overview.setUp}>
                    <NavRow
                        detail={fill(overview.accountsDetail.value, { hidden, open })}
                        onClick={() => onOpen("accounts")}
                        title={overview.accounts}
                    />
                    <NavRow
                        detail={fill(overview.categoriesDetail.value, {
                            created,
                            matched: targets.length - created,
                        })}
                        onClick={() => onOpen("categories")}
                        title={overview.categories}
                    />
                    {budgets > 0 ? (
                        <NavRow
                            detail={fill(overview.budgetsDetail.value, { n: budgets })}
                            onClick={() => onOpen("budgets")}
                            title={overview.budgets}
                        />
                    ) : null}
                    {analysis.currencies.length > 1 ? (
                        <NavRow
                            detail={fill(overview.currenciesDetail.value, { list: analysis.currencies.join(", ") })}
                            title={overview.currencies}
                        />
                    ) : null}
                    <NavRow
                        detail={startDetail}
                        onClick={analysis.overlap ? () => onOpen("start") : undefined}
                        title={overview.starting}
                    />
                </Card>
            </Columns>
        </ImportPage>
    );
}
