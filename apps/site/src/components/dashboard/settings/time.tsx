import { BUDGET_TYPE, periodEnd, startOfPeriod } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";
import { isoWeek, monthGrid, weekDays, weekdayOrder } from "@outlayr/money/time-grid";
import { Select } from "panelui-web/select";
import { useContext, useId, useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { LedgerSettingsContext, useDisplayFormat } from "@/lib/ledger-settings";

import { Choice, Row, SectionHead, SettingsCard, useSaveSettings } from "./parts";

const SUNDAY = 1;
const MONDAY = 2;
const LAST_MONTH_DAY = 28;
const MONTH_DAYS = Array.from({ length: LAST_MONTH_DAY }, (_, index) => String(index + 1));

function useRange(type: number) {
    const { firstDayOfMonth, firstWeekday } = useContext(LedgerSettingsContext);
    const { today } = useDashboard().ledger;
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const start = startOfPeriod(new Date(`${today}T12:00:00`), type, { firstDayOfMonth, firstWeekday });
        const last = addDays(periodEnd(start, type), -1);
        return new Intl.DateTimeFormat(date === "en-GB" ? "en-US" : date, {
            day: "numeric",
            month: "short",
        }).formatRange(start, last);
    }, [date, firstDayOfMonth, firstWeekday, today, type]);
}

export function Time() {
    const copy = useIntlayer("dashboard-settings");
    const { firstDayOfMonth, firstWeekday, timeZone, use24HourClock } = useContext(LedgerSettingsContext);
    const save = useSaveSettings();
    const week = useRange(BUDGET_TYPE.week);
    const month = useRange(BUDGET_TYPE.month);
    const dayId = useId();
    const { time } = copy;
    const { clockTime } = useDisplayFormat();
    const { today } = useDashboard().ledger;
    const zoneOffset = timeZone ? zoneLabel(timeZone) : null;
    return (
        <>
            <SectionHead title={copy.sections.time} />
            <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-4">
                    <SettingsCard title={time.starts}>
                        <Row
                            hint={<span className="font-mono">{time.weekNote({ range: week })}</span>}
                            label={time.week}
                        >
                            <Choice
                                label={time.week.value}
                                onChange={(next) => save({ firstWeekday: String(next) })}
                                options={[
                                    { label: time.sunday.value, value: SUNDAY },
                                    { label: time.monday.value, value: MONDAY },
                                ]}
                                value={firstWeekday === MONDAY ? MONDAY : SUNDAY}
                            />
                        </Row>
                        <Row
                            hint={<span className="font-mono">{time.monthNote({ range: month })}</span>}
                            label={time.month}
                            labelFor={dayId}
                        >
                            <Select
                                items={MONTH_DAYS.map((day) => ({ label: time.day({ day }).value, value: day }))}
                                onValueChange={(day) => day && save({ firstDayOfMonth: day })}
                                value={String(firstDayOfMonth)}
                            >
                                <Select.Trigger className="w-28" id={dayId}>
                                    <Select.Value />
                                </Select.Trigger>
                                <Select.Content>
                                    {MONTH_DAYS.map((day) => (
                                        <Select.Item key={day} value={day}>
                                            {time.day({ day })}
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select>
                        </Row>
                    </SettingsCard>
                    <SettingsCard title={time.format}>
                        <Row
                            hint={<span className="font-mono">{time.now({ time: clockTime(nowClock()) })}</span>}
                            label={time.clock}
                        >
                            <Choice
                                label={time.clock.value}
                                onChange={(next) => save({ use24HourClock: String(next === "24") })}
                                options={[
                                    { label: time.twelveHour.value, value: "12" },
                                    { label: time.twentyFourHour.value, value: "24" },
                                ]}
                                value={use24HourClock ? "24" : "12"}
                            />
                        </Row>
                    </SettingsCard>
                    <SettingsCard title={time.timeZone}>
                        <Row
                            hint={
                                <span className="font-mono">
                                    {timeZone ? `${timeZone}, ${zoneOffset}` : time.notSet}
                                </span>
                            }
                            label={time.zone}
                        />
                    </SettingsCard>
                </div>
                <Calendar firstWeekday={firstWeekday === MONDAY ? MONDAY : SUNDAY} today={today} />
            </div>
        </>
    );
}

const nowClock = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

function zoneLabel(timeZone: string) {
    try {
        return (
            new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
                .formatToParts(new Date())
                .find((part) => part.type === "timeZoneName")
                ?.value.replace("GMT", "UTC") ?? ""
        );
    } catch {
        return "";
    }
}

// PanelUI has no month calendar: day-grid draws dots sized by activity, not dated cells.
function Calendar({ firstWeekday, today }: { firstWeekday: number; today: string }) {
    const { time } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    const week = new Set(weekDays(today, firstWeekday));
    const title = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC", year: "numeric" }).format(
        new Date(`${today}T12:00:00Z`)
    );
    const weekday = new Intl.DateTimeFormat(date, { timeZone: "UTC", weekday: "narrow" });
    return (
        <SettingsCard
            action={
                <span className="text-muted-foreground font-mono text-[13px]">
                    {time.weekNumber({ week: isoWeek(today) })}
                </span>
            }
            title={<span className="capitalize">{title}</span>}
        >
            <div className="grid grid-cols-7 gap-1 p-3 text-center font-mono text-[13px]">
                {weekdayOrder(firstWeekday).map((day) => (
                    <span
                        className="text-muted-foreground flex h-8 items-center justify-center font-sans text-xs"
                        key={day}
                    >
                        {weekday.format(new Date(`${day}T12:00:00Z`))}
                    </span>
                ))}
                {monthGrid(today, firstWeekday).map((cell, index) => {
                    if (cell === null) {
                        return <span aria-hidden key={`blank-${index}`} />;
                    }
                    const isToday = cell.day === today;
                    const inWeek = week.has(cell.day);
                    const weekTint = inWeek ? "bg-primary/15" : "";
                    return (
                        <span
                            aria-current={isToday ? "date" : undefined}
                            className={`flex h-9 items-center justify-center rounded-lg ${
                                isToday ? "bg-primary text-primary-foreground" : weekTint
                            } ${cell.inMonth || inWeek ? "" : "text-muted-foreground"}`}
                            key={cell.day}
                        >
                            {Number(cell.day.slice(8))}
                        </span>
                    );
                })}
            </div>
        </SettingsCard>
    );
}
