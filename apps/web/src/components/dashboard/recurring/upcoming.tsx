import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import { isActive, upcomingOf } from "@/lib/recurring";
import type { Candidate, RecurringModel, UpcomingGroup } from "@/lib/recurring";

import { Glyph } from "../accounts/glyph";
import { useCategoryName } from "../home/format";
import { CategoryBadge } from "../rules/parts";
import type { ScheduleActions } from "./menu";
import { ScheduleMenu } from "./menu";
import {
    CELL,
    FIGURE,
    GROUP,
    HEAD,
    MUTED,
    NameCell,
    ScheduleTile,
    candidateDoc,
    useAccountName,
    useChargeMoney,
    useDay,
    useRepeatText,
} from "./parts";

export function useGroupTitle() {
    const { groups } = useIntlayer("dashboard-recurring");
    const days = useDay();
    const { ledger } = useDashboard();
    return (group: UpcomingGroup) => {
        if (group === "later" || group === "missed" || group === "today" || group === "tomorrow") {
            return groups[group];
        }
        const key = group.slice("month:".length);
        return key.slice(0, 4) === ledger.today.slice(0, 4) ? days.month(key) : days.monthYear(key);
    };
}

export function GroupRow({ children, span }: { children: ReactNode; span: number }) {
    return (
        <Table.Row className="bg-background/30 hover:bg-background/30">
            <Table.Cell className={GROUP} colSpan={span}>
                {children}
            </Table.Cell>
        </Table.Row>
    );
}

export function Foot({ children }: { children: ReactNode }) {
    return (
        <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-2 py-3.5 ps-4 pe-6 text-[13px]">
            {children}
        </div>
    );
}

export function UpcomingTable({ actions, model }: { actions: ScheduleActions; model: RecurringModel }) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const days = useDay();
    const repeat = useRepeatText();
    const accountName = useAccountName();
    const cash = useChargeMoney();
    const groupTitle = useGroupTitle();
    const rows = upcomingOf(model, ledger);
    const total = rows.reduce((sum, row) => sum + (row.schedule.seed.income ? 0 : row.schedule.worth), 0);
    const span = 7;
    return (
        <>
            <Table className="w-full table-fixed" containerClassName="overflow-x-auto">
                <Table.Header className="in-data-[sticky]:bg-card">
                    <Table.Row className="border-0 hover:bg-transparent">
                        <Table.Head className={`${HEAD} w-[23%] min-w-44`}>{copy.columns.name}</Table.Head>
                        <Table.Head className={`${HEAD} w-[17%] max-lg:hidden`}>{copy.columns.category}</Table.Head>
                        <Table.Head className={`${HEAD} w-[12%] max-xl:hidden`}>{copy.columns.account}</Table.Head>
                        <Table.Head className={`${HEAD} w-[10%] max-md:hidden`}>{copy.columns.repeats}</Table.Head>
                        <Table.Head className={`${HEAD} w-[13%]`}>{copy.columns.date}</Table.Head>
                        <Table.Head align="end" className={`${HEAD} w-[13%]`}>
                            {copy.columns.amount}
                        </Table.Head>
                        <Table.Head className={`${HEAD} w-[124px]`} />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {rows.map((row, index) => {
                        const { charge, schedule } = row;
                        const fresh = rows[index - 1]?.group !== row.group;
                        return (
                            <Fragment key={`${schedule.id}:${charge.day}`}>
                                {fresh ? <GroupRow span={span}>{groupTitle(row.group)}</GroupRow> : null}
                                <Table.Row
                                    className="hover:bg-muted/40 cursor-pointer"
                                    onClick={() => actions.open(schedule)}
                                >
                                    <Table.Cell className={CELL}>
                                        <NameCell name={schedule.name} seed={schedule.seed} />
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} max-lg:hidden`}>
                                        <CategoryBadge id={schedule.seed.categoryId} />
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} ${MUTED} truncate max-xl:hidden`}>
                                        {accountName(schedule.seed.accountId)}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} ${MUTED} max-md:hidden`}>
                                        {repeat.short(schedule.chain.type, schedule.chain.every)}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground`}>
                                        {days.day(charge.day, ledger.today)}
                                    </Table.Cell>
                                    <Table.Cell align="end" className={`${CELL} ${FIGURE} text-sm font-medium`}>
                                        {cash.signed(schedule.worth, schedule.seed.income)}
                                    </Table.Cell>
                                    <Table.Cell className={CELL}>
                                        <div className="flex items-center justify-end gap-2">
                                            {row.due ? (
                                                <Button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        actions.log(schedule, charge);
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    {copy.actions.logIt}
                                                </Button>
                                            ) : null}
                                            <ScheduleMenu actions={actions} schedule={schedule} />
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            </Fragment>
                        );
                    })}
                </Table.Body>
            </Table>
            <Foot>
                <span>
                    {rows.length === 1 ? copy.footer.aheadOne : copy.footer.ahead({ count: String(rows.length) })}
                </span>
                <span className="ml-auto">
                    {copy.footer.total}{" "}
                    <span className="dash-figure text-foreground ms-1.5 font-medium">{cash.plain(total)}</span>
                </span>
            </Foot>
        </>
    );
}

export function SideCard({
    action,
    aside,
    children,
    count,
    foot,
    title,
}: {
    action?: ReactNode;
    aside?: ReactNode;
    children: ReactNode;
    count?: number;
    foot?: ReactNode;
    title: ReactNode;
}) {
    return (
        <Frame className="min-w-0">
            <Frame.Header className="flex flex-row items-center gap-2">
                <Frame.Title as="h2" className="flex items-center gap-2.5 whitespace-nowrap">
                    {title}
                    {count === undefined ? null : (
                        <span className="dash-figure text-app-tint bg-app-tint/12 rounded-md px-1.5 text-xs leading-5 font-medium">
                            {count}
                        </span>
                    )}
                </Frame.Title>
                <span className="ml-auto flex items-center">
                    {aside ? <span className="dash-figure text-muted-foreground text-[13px]">{aside}</span> : null}
                    {action}
                </span>
            </Frame.Header>
            <Frame.Panel className="px-5 py-2">{children}</Frame.Panel>
            {foot ? <Frame.Footer className="text-muted-foreground text-[13px]">{foot}</Frame.Footer> : null}
        </Frame>
    );
}

export function CandidateLine({ candidate }: { candidate: Candidate }) {
    const copy = useIntlayer("dashboard-recurring");
    const repeat = useRepeatText();
    const cash = useChargeMoney();
    return copy.detected.perCycle({
        amount: cash.plain(candidate.worth),
        cadence: repeat.word(candidate.type, candidate.every),
    });
}

export function CandidateTile({ candidate }: { candidate: Candidate }) {
    const { ledger } = useDashboard();
    const doc = candidateDoc(ledger, candidate);
    const seed = doc ?? {
        categoryId: candidate.categoryId,
        customColor: null,
        emoji: null,
        icon: null,
        imageColor: null,
        imageKey: null,
    };
    return <ScheduleTile name={candidate.name} seed={seed} />;
}

const SIDE_CANDIDATES = 3;

export function DetectedCard({
    actions,
    model,
    onSeeAll,
}: {
    actions: ScheduleActions;
    model: RecurringModel;
    onSeeAll: () => void;
}) {
    const copy = useIntlayer("dashboard-recurring");
    if (model.candidates.length === 0) {
        return null;
    }
    return (
        <SideCard
            action={
                <Button className="text-muted-foreground -me-2" onClick={onSeeAll} size="sm" variant="ghost">
                    {copy.detected.seeAll}
                </Button>
            }
            count={model.candidates.length}
            title={copy.tabs.detected}
        >
            {model.candidates.slice(0, SIDE_CANDIDATES).map((candidate) => (
                <div className="flex h-[66px] items-center gap-3 border-b last:border-0" key={candidate.key}>
                    <CandidateTile candidate={candidate} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{candidate.name}</p>
                        <p className="dash-figure text-muted-foreground truncate text-[13px]">
                            <CandidateLine candidate={candidate} />
                        </p>
                    </div>
                    <Button
                        aria-label={copy.detected.notRecurring.value}
                        onClick={() => actions.dismiss(candidate)}
                        size="icon-sm"
                        variant="outline"
                    >
                        <Glyph icon={Cancel01Icon} size={15} />
                    </Button>
                    <Button
                        aria-label={copy.detected.confirm.value}
                        onClick={() => actions.confirm(candidate)}
                        size="icon-sm"
                        variant="outline"
                    >
                        <Glyph icon={Tick02Icon} size={15} />
                    </Button>
                </div>
            ))}
        </SideCard>
    );
}

export function PerMonthCard({ model }: { model: RecurringModel }) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const categoryName = useCategoryName();
    const cash = useChargeMoney();
    const spending = model.schedules
        .filter((schedule) => isActive(schedule) && !schedule.seed.income && schedule.perMonth > 0)
        .toSorted((a, b) => b.perMonth - a.perMonth);
    if (spending.length === 0) {
        return null;
    }
    const total = spending.reduce((sum, schedule) => sum + schedule.perMonth, 0);
    const byCategory = [...Map.groupBy(spending, (schedule) => schedule.seed.categoryId ?? "").entries()]
        .map(([id, schedules]) => {
            const category = ledger.categories.get(id);
            return {
                color: category?.color ?? NEUTRAL_COLOR,
                id,
                name: category ? categoryName(category) : "",
                total: schedules.reduce((sum, schedule) => sum + schedule.perMonth, 0),
            };
        })
        .toSorted((a, b) => b.total - a.total);
    return (
        <SideCard aside={cash.plain(total)} foot={copy.perMonth.twelfth} title={copy.kpi.perMonth}>
            <div className="box-content flex h-1.5 gap-1 pt-3 pb-1">
                {byCategory.map((category) => (
                    <i
                        className="h-1.5 min-w-1.5 rounded-full"
                        key={category.id}
                        style={{ backgroundColor: category.color, flexGrow: category.total }}
                    />
                ))}
            </div>
            <div className="border-b py-2">
                {byCategory.map((category) => (
                    <div className="flex h-9 items-center gap-2.5 px-1.5 text-sm font-medium" key={category.id}>
                        <i className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="truncate">{category.name}</span>
                        <span className="dash-figure ml-auto">{cash.plain(category.total)}</span>
                    </div>
                ))}
            </div>
            <div className="py-2">
                {spending.map((schedule) => (
                    <div className="text-muted-foreground flex h-9 items-center gap-2 px-1.5 text-sm" key={schedule.id}>
                        <span className="truncate">{schedule.name}</span>
                        <span className="dash-figure ml-auto">{cash.plain(schedule.perMonth)}</span>
                    </div>
                ))}
            </div>
        </SideCard>
    );
}
