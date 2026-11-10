import BalanceScaleIcon from "@hugeicons/core-free-icons/BalanceScaleIcon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import MoneyExchange01Icon from "@hugeicons/core-free-icons/MoneyExchange01Icon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import { Button } from "panelui-web/button";
import { useIntlayer } from "react-intlayer";

import { useDateFormat, useMonthYear } from "@/components/dashboard/home/format";
import { money } from "@/lib/ledger";

import { Card, Columns, ImportPage } from "../parts";
import { fill, planOf, planSize } from "./model";
import type { Draft, Screen } from "./model";
import { MmBar, NavRow, Tile, ValueRow } from "./parts";

const WARN = "text-app-tint";
const BAR_MIN = 6;

interface Props {
    draft: Draft;
    onCancel: () => void;
    onImport: () => void;
    onOpen: (screen: Screen) => void;
}

export function Overview({ draft, onCancel, onImport, onOpen }: Props) {
    const { bar, overview } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const monthYear = useMonthYear();
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
    const needsCount =
        Number(uncategorized > 0) +
        Number(analysis.uncategorized.pairs.length > 0) +
        Number(analysis.balanceGaps.length > 0);
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
                                            from: monthYear(analysis.firstDay),
                                            to: monthYear(analysis.lastDay),
                                        })}
                                    </small>
                                ) : null}
                                <ul className="mt-3 flex h-20 items-end gap-2">
                                    {analysis.perYear.map((year) => (
                                        <li
                                            className="flex h-full min-w-0 flex-1 flex-col gap-1.5 text-xs"
                                            key={year.year}
                                            title={year.count.toLocaleString()}
                                        >
                                            <span className="flex min-h-0 flex-1 items-end">
                                                <span
                                                    aria-hidden
                                                    className="bg-primary w-full rounded-sm"
                                                    style={{
                                                        height: `${Math.max(BAR_MIN, (year.count / peak) * 100)}%`,
                                                    }}
                                                />
                                            </span>
                                            <span className="dash-figure text-center">{year.year}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                        <Card title={overview.leftBehind}>
                            <ValueRow label={overview.deletedEntries} value={analysis.removedEntryCount} />
                            <ValueRow label={overview.deletedAccounts} value={analysis.removedAccountCount} />
                            <ValueRow label={overview.reminders} value={analysis.reminderCount} />
                        </Card>
                        <Card title={overview.undo}>
                            <p className="text-muted-foreground px-4 py-3 text-sm leading-5">{overview.undoBody}</p>
                        </Card>
                    </>
                }
            >
                {needsCount > 0 ? (
                    <Card
                        action={
                            <span className="dash-figure flex items-center gap-1.5 text-xs">
                                <span aria-hidden className="bg-app-tint size-1.5 rounded-full" />
                                {needsCount}
                            </span>
                        }
                        title={overview.needs}
                    >
                        {uncategorized > 0 ? (
                            <NavRow
                                leading={<Tile icon={Tag01Icon} />}
                                onClick={() => onOpen("uncategorized")}
                                title={fill(overview.noCategory.value, { n: uncategorized.toLocaleString() })}
                                tone={WARN}
                            />
                        ) : null}
                        {analysis.uncategorized.pairs.length > 0 ? (
                            <NavRow
                                leading={<Tile icon={Tag01Icon} />}
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
                                leading={<Tile icon={BalanceScaleIcon} />}
                                onClick={() => onOpen("balances")}
                                title={fill(overview.offOne.value, { name: gapAccount?.title ?? "" })}
                                tone={WARN}
                            />
                        ) : null}
                        {analysis.balanceGaps.length > 1 ? (
                            <NavRow
                                detail={fill(overview.offManyDetail.value, { n: analysis.balanceGaps.length })}
                                leading={<Tile icon={BalanceScaleIcon} />}
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
                        leading={<Tile icon={CreditCardIcon} />}
                        onClick={() => onOpen("accounts")}
                        title={overview.accounts}
                    />
                    <NavRow
                        detail={fill(overview.categoriesDetail.value, {
                            created,
                            matched: targets.length - created,
                        })}
                        leading={<Tile icon={DashboardSquare01Icon} />}
                        onClick={() => onOpen("categories")}
                        title={overview.categories}
                    />
                    {budgets > 0 ? (
                        <NavRow
                            detail={fill(overview.budgetsDetail.value, { n: budgets })}
                            leading={<Tile icon={PieChartIcon} />}
                            onClick={() => onOpen("budgets")}
                            title={overview.budgets}
                        />
                    ) : null}
                    {analysis.currencies.length > 1 ? (
                        <NavRow
                            detail={fill(overview.currenciesDetail.value, { list: analysis.currencies.join(", ") })}
                            leading={<Tile icon={MoneyExchange01Icon} />}
                            title={overview.currencies}
                        />
                    ) : null}
                    <NavRow
                        detail={startDetail}
                        leading={<Tile icon={Calendar03Icon} />}
                        onClick={analysis.overlap ? () => onOpen("start") : undefined}
                        title={overview.starting}
                    />
                </Card>
            </Columns>
        </ImportPage>
    );
}
