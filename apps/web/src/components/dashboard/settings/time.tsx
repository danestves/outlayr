import { BUDGET_TYPE, periodEnd, startOfPeriod } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";
import { Select } from "panelui-web/select";
import { useContext, useId, useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

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
    return (
        <>
            <SectionHead title={copy.sections.time} />
            <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
                <SettingsCard title={time.starts}>
                    <Row hint={time.weekNote({ range: week })} label={time.week}>
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
                    <Row hint={time.monthNote({ range: month })} label={time.month} labelFor={dayId}>
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
                    <Row label={time.clock}>
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
                    <Row hint={time.timeZoneHint} label={time.timeZone}>
                        <span className="text-muted-foreground text-sm">{timeZone ?? time.notSet}</span>
                    </Row>
                </SettingsCard>
            </div>
        </>
    );
}
