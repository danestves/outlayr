import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { DAY_MS, wallNoon } from "@outlayr/money/ledger-zone";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Candidate } from "@/lib/recurring";

import { Glyph } from "../accounts/glyph";
import { QuietTable } from "../home/setup";
import { CategoryBadge } from "../rules/parts";
import type { ScheduleActions } from "./menu";
import { CELL, FIGURE, HEAD, MUTED, useAccountName, useChargeMoney, useDay, useRepeatText } from "./parts";
import { CandidateTile } from "./upcoming";

export const daysBetween = (later: string, earlier: string) =>
    Math.round((wallNoon(later) - wallNoon(earlier)) / DAY_MS);

export function DetectedEmpty() {
    const { detected } = useIntlayer("dashboard-recurring");
    return (
        <div className="dash-empty relative isolate min-h-[299px] flex-1 justify-end pt-0 pb-7">
            <QuietTable />
            <b className="text-[15px] font-semibold">{detected.emptyTitle}</b>
            <p className="text-muted-foreground max-w-sm text-[13px]">{detected.emptyLine}</p>
        </div>
    );
}

export function DetectedTable({
    actions,
    candidates,
    onSelect,
    selected,
}: {
    actions: ScheduleActions;
    candidates: readonly Candidate[];
    onSelect: (key: string) => void;
    selected: string | null;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const days = useDay();
    const repeat = useRepeatText();
    const accountName = useAccountName();
    const cash = useChargeMoney();
    return (
        <Table className="w-full table-fixed" containerClassName="overflow-x-auto">
            <Table.Header className="in-data-[sticky]:bg-card">
                <Table.Row className="border-0 hover:bg-transparent">
                    <Table.Head className={`${HEAD} w-[13%] min-w-40`}>{copy.columns.name}</Table.Head>
                    <Table.Head className={`${HEAD} w-[14%] max-lg:hidden`}>{copy.columns.category}</Table.Head>
                    <Table.Head className={`${HEAD} w-[10%] max-xl:hidden`}>{copy.columns.account}</Table.Head>
                    <Table.Head className={`${HEAD} w-[8.5%] max-md:hidden`}>{copy.columns.looksLike}</Table.Head>
                    <Table.Head className={`${HEAD} w-[8.5%] max-xl:hidden`}>{copy.columns.seen}</Table.Head>
                    <Table.Head className={`${HEAD} w-[11%] max-sm:hidden`}>{copy.columns.nextDate}</Table.Head>
                    <Table.Head align="end" className={`${HEAD} w-[8%] max-md:hidden`}>
                        {copy.columns.amount}
                    </Table.Head>
                    <Table.Head align="end" className={`${HEAD} w-[8.5%]`}>
                        {copy.columns.perMonth}
                    </Table.Head>
                    <Table.Head className={`${HEAD} w-[312px] max-sm:w-[104px]`} />
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {candidates.map((candidate) => {
                    const lit = candidate.key === selected;
                    return (
                        <Table.Row
                            aria-selected={lit}
                            className={`relative h-[57px] cursor-pointer ${lit ? "bg-app-tint/8 hover:bg-app-tint/8 shadow-[inset_3px_0_0_var(--color-app-tint)]" : "hover:bg-muted/40"}`}
                            key={candidate.key}
                            onClick={() => onSelect(candidate.key)}
                        >
                            <Table.Cell className={CELL}>
                                <span className="flex min-w-0 items-center gap-3">
                                    <CandidateTile candidate={candidate} />
                                    <span className="truncate text-sm font-medium">{candidate.name}</span>
                                </span>
                            </Table.Cell>
                            <Table.Cell className={`${CELL} max-lg:hidden`}>
                                <CategoryBadge id={candidate.categoryId} />
                            </Table.Cell>
                            <Table.Cell className={`${CELL} ${MUTED} truncate max-xl:hidden`}>
                                {accountName(candidate.accountId)}
                            </Table.Cell>
                            <Table.Cell className={`${CELL} ${MUTED} max-md:hidden`}>
                                {repeat.short(candidate.type, candidate.every)}
                            </Table.Cell>
                            <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground max-xl:hidden`}>
                                {copy.detected.seen({ count: String(candidate.entries.length) })}
                            </Table.Cell>
                            <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground max-sm:hidden`}>
                                {days.day(candidate.next.day, ledger.today)}
                            </Table.Cell>
                            <Table.Cell align="end" className={`${CELL} ${FIGURE} text-sm font-medium max-md:hidden`}>
                                {cash.plain(candidate.worth)}
                            </Table.Cell>
                            <Table.Cell align="end" className={`${CELL} ${FIGURE} text-sm font-medium`}>
                                {cash.plain(candidate.perMonth)}
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        className="max-sm:hidden"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            actions.dismiss(candidate);
                                        }}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {copy.detected.notRecurring}
                                    </Button>
                                    <Button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            actions.confirm(candidate);
                                        }}
                                        size="sm"
                                        variant="outline"
                                    >
                                        <Glyph icon={Tick02Icon} size={15} />
                                        {copy.detected.confirm}
                                    </Button>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
        </Table>
    );
}

export function CandidateDetail({ candidate }: { candidate: Candidate }) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const navigate = useNavigate();
    const days = useDay();
    const accountName = useAccountName();
    const cash = useChargeMoney();
    const entries = candidate.entries.toSorted((a, b) => b.at - a.at);
    const oldest = entries.at(-1);
    return (
        <Frame className="min-h-0 min-w-0 flex-1">
            <Frame.Header className="flex flex-row items-center gap-3">
                <CandidateTile candidate={candidate} />
                <Frame.Title as="h2" className="truncate">
                    {candidate.name}
                </Frame.Title>
                <span className="text-muted-foreground text-[13px] whitespace-nowrap max-sm:hidden">
                    {copy.detected.matching({ count: String(entries.length) })}
                </span>
                <span className="dash-figure text-muted-foreground ml-auto text-[13px] whitespace-nowrap">
                    {copy.detected.since({
                        amount: cash.plain(candidate.total),
                        month: days.month(candidate.since.slice(0, 7)),
                    })}
                </span>
            </Frame.Header>
            <Frame.Panel className="min-h-0 flex-1 overflow-y-auto">
                <Table className="w-full table-fixed">
                    <Table.Header>
                        <Table.Row className="border-0 hover:bg-transparent">
                            <Table.Head className={`${HEAD} w-[18%]`}>{copy.columns.date}</Table.Head>
                            <Table.Head className={`${HEAD} w-[17%] max-sm:hidden`}>{copy.columns.account}</Table.Head>
                            <Table.Head className={`${HEAD} w-[25%] max-md:hidden`}>{copy.columns.category}</Table.Head>
                            <Table.Head className={HEAD}>{copy.columns.gap}</Table.Head>
                            <Table.Head align="end" className={HEAD}>
                                {copy.columns.amount}
                            </Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {entries.map((entry, index) => {
                            const before = entries[index + 1];
                            return (
                                <Table.Row className="h-[62px] hover:bg-transparent" key={entry.id}>
                                    <Table.Cell className={`${CELL} ${FIGURE} text-sm`}>
                                        {days.day(entry.day, ledger.today)}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} ${MUTED} max-sm:hidden`}>
                                        {accountName(entry.accountId)}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} max-md:hidden`}>
                                        <CategoryBadge id={entry.categoryId} />
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground`}>
                                        {before
                                            ? copy.detected.gapDays({
                                                  count: String(daysBetween(entry.day, before.day)),
                                              })
                                            : null}
                                    </Table.Cell>
                                    <Table.Cell align="end" className={`${CELL} ${FIGURE} text-sm font-medium`}>
                                        {cash.signed(entry.worth, candidate.income)}
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table>
            </Frame.Panel>
            <Frame.Footer className="text-muted-foreground flex flex-row items-center text-[13px]">
                {copy.detected.footer({ count: String(candidate.gap) })}
                <Button
                    className="ml-auto"
                    onClick={() =>
                        navigate({
                            search: { from: oldest?.day, q: candidate.name, to: ledger.today },
                            to: "/app/transactions",
                        })
                    }
                    size="sm"
                    variant="outline"
                >
                    {copy.detected.seeEntries}
                </Button>
            </Frame.Footer>
        </Frame>
    );
}
