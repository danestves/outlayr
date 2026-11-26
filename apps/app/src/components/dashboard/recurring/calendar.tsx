import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { wallNoon } from "@outlayr/money/ledger-zone";
import { Button } from "panelui-web/button";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import { useMeta } from "@/lib/ledger-settings";
import { addDays, isActive, monthEvents, nextCharges } from "@/lib/recurring";
import type { MonthEvent, RecurringModel } from "@/lib/recurring";
import { weekStart, weekStartIso } from "@/lib/week-start";

import { Glyph } from "../accounts/glyph";
import type { ScheduleActions } from "./menu";
import {
    CategoryBadge,
    ScheduleTile,
    useAccountName,
    useCategoryLook,
    useChargeMoney,
    useDay,
    useRepeatText,
} from "./parts";
import { SideCard } from "./upcoming";

const WEEK = 7;
const SUNDAY = 7;
const NEXT_SHOWN = 2;

const shiftMonth = (month: string, by: number) => {
    const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1));
    return date.toISOString().slice(0, 7);
};

const lastDayOf = (month: string) => addDays(`${shiftMonth(month, 1)}-01`, -1);

/** Monday is 1 and Sunday 7, as the grid lays weeks out. */
const weekdayOf = (day: string) => new Date(wallNoon(day)).getUTCDay() || SUNDAY;

const leadDays = (weekday: number, start: number) => (weekday - start + WEEK) % WEEK;
const trailDays = (weekday: number, start: number) => (start - 1 - weekday + WEEK) % WEEK;

function gridDays(month: string, firstWeekday: number) {
    const start = weekStartIso(firstWeekday);
    const first = `${month}-01`;
    const last = lastDayOf(month);
    const from = addDays(first, -leadDays(weekdayOf(first), start));
    const to = addDays(last, trailDays(weekdayOf(last), start));
    const days: string[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
        days.push(day);
    }
    return days;
}

const spent = (events: readonly MonthEvent[]) =>
    events.filter((event) => !event.schedule.seed.income).reduce((sum, event) => sum + event.worth, 0);

export interface CalendarProps {
    actions: ScheduleActions;
    day: string | null;
    model: RecurringModel;
    month: string;
    onDay: (day: string) => void;
    onMonth: (month: string | null) => void;
}

function useCalendar({ day, model, month }: Pick<CalendarProps, "day" | "model" | "month">) {
    const { ledger } = useDashboard();
    const meta = useMeta();
    const { locale } = useLocale();
    const chosen = meta.get("firstWeekday");
    const firstWeekday = weekStart(chosen === "1" || chosen === "2" ? Number(chosen) : null, locale);
    const days = gridDays(month, firstWeekday);
    const months = [...new Set(days.map((each) => each.slice(0, 7)))];
    const events = months.flatMap((key) => monthEvents(model, ledger, key));
    const byDay = Map.groupBy(events, (event) => event.day);
    const inMonth = events.filter((event) => event.day.startsWith(month));
    const fallback = month === ledger.today.slice(0, 7) ? ledger.today : (inMonth.at(0)?.day ?? `${month}-01`);
    return { byDay, days, firstWeekday, inMonth, selected: day ?? fallback };
}

export function CalendarGrid(props: CalendarProps) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const categoryLook = useCategoryLook();
    const format = useDay();
    const cash = useChargeMoney();
    const { month, onDay, onMonth } = props;
    const { byDay, days, inMonth, selected } = useCalendar(props);
    const weeks = days.length / WEEK;
    return (
        <div className="flex min-h-140 flex-1 flex-col">
            <div className="flex min-h-13 flex-wrap items-center gap-2 border-b px-4 py-0">
                <Button
                    aria-label={copy.calendar.previousMonth.value}
                    onClick={() => onMonth(shiftMonth(month, -1))}
                    className="size-7.5"
                    size="icon"
                    variant="outline"
                >
                    <Glyph icon={ArrowLeft01Icon} size={16} />
                </Button>
                <Button
                    aria-label={copy.calendar.nextMonth.value}
                    onClick={() => onMonth(shiftMonth(month, 1))}
                    className="size-7.5"
                    size="icon"
                    variant="outline"
                >
                    <Glyph icon={ArrowRight01Icon} size={16} />
                </Button>
                <h2 aria-live="polite" className="text-app-title ms-2 me-1 font-semibold">
                    {format.monthYear(month)}
                </h2>
                <Button
                    disabled={month === ledger.today.slice(0, 7)}
                    onClick={() => onMonth(null)}
                    size="sm"
                    variant="outline"
                >
                    {copy.calendar.today}
                </Button>
                <span className="text-muted-foreground text-app-label ml-auto">
                    {inMonth.length === 1 ? copy.chargesOne : copy.charges({ count: String(inMonth.length) })}
                    <span className="dash-figure text-foreground text-app-body ms-2 font-medium">
                        {cash.plain(spent(inMonth))}
                    </span>
                </span>
            </div>
            <div className="grid grid-cols-7 border-b">
                {days.slice(0, WEEK).map((each) => (
                    <span className="text-muted-foreground text-app-caption px-2.5 py-1.5 font-medium" key={each}>
                        {format.weekdayShort(each)}
                    </span>
                ))}
            </div>
            <div
                className="grid flex-1 grid-cols-7"
                role="grid"
                style={{ gridTemplateRows: `repeat(${weeks}, minmax(96px, 1fr))` }}
            >
                {days.map((each, index) => {
                    const outside = !each.startsWith(month);
                    const isToday = each === ledger.today;
                    const isSelected = each === selected;
                    const events = byDay.get(each) ?? [];
                    return (
                        <button
                            aria-pressed={isSelected}
                            className={`focus-visible:ring-ring flex min-w-0 flex-col items-start gap-1.5 overflow-hidden border-e border-b px-2 py-1.75 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset ${index % WEEK === WEEK - 1 ? "border-e-0" : ""} ${index >= days.length - WEEK ? "border-b-0" : ""} ${isSelected ? "bg-muted/50 ring-border ring-1 ring-inset" : "hover:bg-muted/25"}`}
                            key={each}
                            onClick={() => onDay(each)}
                            type="button"
                        >
                            <span
                                className={`dash-figure text-app-caption flex h-5 min-w-5 items-center justify-center rounded-md px-1 ${isToday ? "bg-primary text-primary-foreground font-semibold" : ""} ${outside && !isToday ? "text-muted-foreground/60" : ""}`}
                            >
                                {Number(each.slice(8, 10))}
                            </span>
                            {events.map((event) => (
                                <span
                                    className={`text-app-caption flex w-full min-w-0 flex-col border-s-2 ps-1.5 leading-3.75 ${outside ? "opacity-55" : ""}`}
                                    key={`${event.schedule.id}:${event.kind}`}
                                    style={{
                                        borderColor:
                                            event.kind === "due"
                                                ? "var(--color-app-warn)"
                                                : (categoryLook(event.schedule.seed.categoryId)?.color ??
                                                  NEUTRAL_COLOR),
                                    }}
                                >
                                    <span className="truncate font-medium">{event.schedule.name}</span>
                                    <span className="dash-figure text-muted-foreground truncate">
                                        {cash.plain(event.worth)}
                                    </span>
                                </span>
                            ))}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function CalendarSide(props: CalendarProps) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const format = useDay();
    const repeat = useRepeatText();
    const cash = useChargeMoney();
    const accountName = useAccountName();
    const { actions, model, month } = props;
    const { byDay, firstWeekday, inMonth, selected } = useCalendar(props);
    const events = byDay.get(selected) ?? [];
    const [only] = events.length === 1 ? events : [];
    const due = model.schedules
        .filter(isActive)
        .flatMap((schedule) => schedule.due.map((charge) => ({ charge, schedule })));
    const last = lastDayOf(month);
    const start = weekStartIso(firstWeekday);
    const weeks: { from: string; to: string }[] = [];
    for (let from = `${month}-01`; from <= last;) {
        const end = addDays(from, trailDays(weekdayOf(from), start));
        const to = end < last ? end : last;
        weeks.push({ from, to });
        from = addDays(to, 1);
    }
    const dayText = (day: string) => format.day(day, ledger.today);
    return (
        <>
            <SideCard
                aside={events.length > 0 ? cash.plain(spent(events)) : undefined}
                foot={
                    only ? (
                        <div className="flex w-full items-center gap-2">
                            {only.schedule.state === "active" ? (
                                <>
                                    <Button onClick={() => actions.edit(only.schedule)} size="sm" variant="outline">
                                        {copy.actions.edit}
                                    </Button>
                                    <Button onClick={() => actions.pause(only.schedule)} size="sm" variant="outline">
                                        {copy.actions.pause}
                                    </Button>
                                </>
                            ) : null}
                            <Button
                                className="ml-auto"
                                onClick={() => actions.open(only.schedule)}
                                size="sm"
                                variant="outline"
                            >
                                {copy.actions.open}
                            </Button>
                        </div>
                    ) : undefined
                }
                title={`${format.weekdayShort(selected)}, ${dayText(selected)}`}
            >
                {events.length === 0 ? (
                    <p className="text-muted-foreground text-app-label py-6 text-center">{copy.calendar.nothingOn}</p>
                ) : null}
                {events.map((event) => (
                    <button
                        className="flex h-14.25 w-full items-center gap-3 border-b text-left last:border-0"
                        key={`${event.schedule.id}:${event.kind}`}
                        onClick={() => actions.open(event.schedule)}
                        type="button"
                    >
                        <ScheduleTile name={event.schedule.name} seed={event.schedule.seed} />
                        <span className="min-w-0 flex-1">
                            <span className="text-app-body block truncate font-medium">{event.schedule.name}</span>
                            <span className="text-muted-foreground text-app-label block truncate">
                                {[
                                    accountName(event.schedule.seed.accountId),
                                    repeat.word(event.schedule.chain.type, event.schedule.chain.every),
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            </span>
                        </span>
                        <span className="dash-figure text-app-body font-medium">
                            {cash.signed(event.worth, event.schedule.seed.income)}
                        </span>
                    </button>
                ))}
                {only ? (
                    <>
                        <div className="text-app-body flex h-9 items-center border-t px-1.5">
                            <span className="text-muted-foreground">{copy.fields.category}</span>
                            <span className="ml-auto">
                                <CategoryBadge id={only.schedule.seed.categoryId} />
                            </span>
                        </div>
                        <div className="text-app-body flex h-9 items-center border-t px-1.5">
                            <span className="text-muted-foreground">{copy.fields.nextCharges}</span>
                            <span className="dash-figure text-muted-foreground ml-auto">
                                {nextCharges(only.schedule, ledger, NEXT_SHOWN + 1)
                                    .filter((charge) => charge.day > selected)
                                    .slice(0, NEXT_SHOWN)
                                    .map((charge) => dayText(charge.day))
                                    .join(", ") || "-"}
                            </span>
                        </div>
                    </>
                ) : null}
            </SideCard>
            {due.length > 0 ? (
                <SideCard
                    aside={cash.plain(due.reduce((sum, { schedule }) => sum + schedule.worth, 0))}
                    title={copy.calendar.dueNow}
                >
                    {due.map(({ charge, schedule }) => (
                        <div
                            className="flex h-14.25 items-center gap-3 border-b last:border-0"
                            key={`${schedule.id}:${charge.day}`}
                        >
                            <ScheduleTile name={schedule.name} seed={schedule.seed} />
                            <button
                                className="min-w-0 flex-1 text-left"
                                onClick={() => actions.open(schedule)}
                                type="button"
                            >
                                <span className="text-app-body block truncate font-medium">{schedule.name}</span>
                                <span className="text-muted-foreground text-app-label block truncate">
                                    {charge.day === ledger.today
                                        ? copy.calendar.todayLine({ amount: cash.plain(schedule.worth) })
                                        : copy.calendar.missedOn({
                                              amount: cash.plain(schedule.worth),
                                              date: dayText(charge.day),
                                          })}
                                </span>
                            </button>
                            <Button onClick={() => actions.log(schedule, charge)} size="sm" variant="outline">
                                {copy.actions.logIt}
                            </Button>
                        </div>
                    ))}
                </SideCard>
            ) : null}
            <SideCard
                foot={
                    <div className="flex w-full items-center">
                        {format.month(month)}
                        <span className="dash-figure text-foreground text-app-body ml-auto font-medium">
                            {cash.plain(spent(inMonth))}
                        </span>
                    </div>
                }
                title={copy.calendar.byWeek}
            >
                {weeks.map(({ from, to }) => {
                    const total = spent(inMonth.filter((event) => event.day >= from && event.day <= to));
                    return (
                        <div className="text-app-body flex h-9 items-center border-b px-1.5 last:border-0" key={from}>
                            <span className="text-muted-foreground">
                                {from === to
                                    ? dayText(from)
                                    : copy.calendar.weekRange({
                                          from: dayText(from),
                                          to: String(Number(to.slice(8, 10))),
                                      })}
                            </span>
                            <span
                                className={`dash-figure ml-auto ${total > 0 ? "font-medium" : "text-muted-foreground"}`}
                            >
                                {cash.plain(total)}
                            </span>
                        </div>
                    );
                })}
            </SideCard>
        </>
    );
}
