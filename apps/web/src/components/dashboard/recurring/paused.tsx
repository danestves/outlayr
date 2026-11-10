import { Table } from "panelui-web/table";
import { Fragment } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { RecurringModel, Schedule } from "@/lib/recurring";

import { QuietTable } from "../home/setup";
import type { ScheduleActions } from "./menu";
import { ScheduleMenu } from "./menu";
import { CELL, FIGURE, HEAD, MUTED, NameCell, useChargeMoney, useDay, useRepeatText } from "./parts";
import { Foot, GroupRow } from "./upcoming";

/** When a chain went quiet: the day it was paused, or its last charge once it ran out. */
export const heldSince = (model: RecurringModel, schedule: Schedule) =>
    schedule.pause?.since ?? model.history.get(schedule.id)?.at(-1)?.day ?? schedule.chain.endDay ?? schedule.startDay;

export function PausedTable({
    actions,
    lit,
    model,
}: {
    actions: ScheduleActions;
    lit: string | null;
    model: RecurringModel;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const days = useDay();
    const repeat = useRepeatText();
    const cash = useChargeMoney();
    const byDay = (a: Schedule, b: Schedule) => heldSince(model, b).localeCompare(heldSince(model, a));
    const paused = model.schedules.filter((schedule) => schedule.state === "paused").toSorted(byDay);
    const stopped = model.schedules.filter((schedule) => schedule.state === "stopped").toSorted(byDay);
    if (paused.length + stopped.length === 0) {
        return (
            <div className="dash-empty relative isolate min-h-[299px] flex-1 justify-end pt-0 pb-7">
                <QuietTable />
                <b className="text-[15px] font-semibold">{copy.paused.emptyTitle}</b>
                <p className="text-muted-foreground max-w-sm text-[13px]">{copy.paused.emptyLine}</p>
            </div>
        );
    }
    const resumes = (schedule: Schedule) => {
        if (schedule.state === "stopped") {
            return copy.form.never;
        }
        const day = schedule.pause?.resumes ?? null;
        return day === null ? copy.paused.whenIResume : days.day(day, ledger.today);
    };
    const span = 6;
    return (
        <>
            <Table className="w-full table-fixed" containerClassName="overflow-x-auto">
                <Table.Header className="in-data-[sticky]:bg-card">
                    <Table.Row className="border-0 hover:bg-transparent">
                        <Table.Head className={`${HEAD} w-[30%] min-w-48`}>{copy.columns.name}</Table.Head>
                        <Table.Head className={`${HEAD} w-[16%] max-md:hidden`}>{copy.columns.repeats}</Table.Head>
                        <Table.Head className={`${HEAD} w-[20%] max-sm:hidden`}>{copy.columns.pausedSince}</Table.Head>
                        <Table.Head className={`${HEAD} w-[18%]`}>{copy.columns.resumes}</Table.Head>
                        <Table.Head align="end" className={HEAD}>
                            {copy.columns.amount}
                        </Table.Head>
                        <Table.Head className={`${HEAD} w-14`} />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {(
                        [
                            ["paused", paused],
                            ["stopped", stopped],
                        ] as const
                    ).map(([state, rows]) =>
                        rows.length === 0 ? null : (
                            <Fragment key={state}>
                                <GroupRow span={span}>{copy.groups[state]}</GroupRow>
                                {rows.map((schedule) => (
                                    <Table.Row
                                        className={`h-[71px] cursor-pointer ${lit === schedule.id ? "bg-app-tint/8 hover:bg-app-tint/8 shadow-[inset_3px_0_0_var(--color-app-tint)]" : "hover:bg-muted/40"}`}
                                        key={schedule.id}
                                        onClick={() => actions.open(schedule)}
                                    >
                                        <Table.Cell className={CELL}>
                                            <NameCell name={schedule.name} seed={schedule.seed} />
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} ${MUTED} max-md:hidden`}>
                                            {repeat.short(schedule.chain.type, schedule.chain.every)}
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground max-sm:hidden`}>
                                            {days.day(heldSince(model, schedule), ledger.today)}
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} ${MUTED} truncate`}>
                                            {resumes(schedule)}
                                        </Table.Cell>
                                        <Table.Cell
                                            align="end"
                                            className={`${CELL} ${FIGURE} text-muted-foreground text-sm`}
                                        >
                                            {cash.plain(schedule.worth)}
                                        </Table.Cell>
                                        <Table.Cell className={CELL}>
                                            <div className="flex justify-end">
                                                <ScheduleMenu actions={actions} schedule={schedule} />
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Fragment>
                        )
                    )}
                </Table.Body>
            </Table>
            <Foot>{copy.paused.footer({ paused: String(paused.length), stopped: String(stopped.length) })}</Foot>
        </>
    );
}
