import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { DayGrid } from "panelui-web/day-grid";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { categoryTone, useCategoryName, useDateFormat } from "./format";
import { everyDay } from "./model";
import type { SetupState } from "./model";
import { Cover, LATE_FADE } from "./setup";

const SIZES = [0.16, 0.36, 0.56, 0.78, 1] as const;
// One sized ring per day of the month, so a new ledger's calendar hints at what it fills in to.
const GHOST_LEVELS = [
    4, 1, 2, 1, 2, 3, 1, 1, 2, 2, 1, 3, 3, 2, 2, 2, 2, 3, 2, 1, 2, 4, 2, 3, 3, 1, 1, 4, 3, 2, 0,
] as const;
const LOGGED_LEVEL = 2;
const WEEK = 7;
const GAP = 4;
const WIDTH = 222;
const TRACK = (WIDTH - (WEEK - 1) * GAP) / WEEK + GAP;
// 2023-12-31 was a Sunday, the day firstWeekday 1 means.
const SUNDAY_NOON = Date.UTC(2023, 11, 31, 12);
const DAY_MS = 86_400_000;
// The parts size and tint their dots by level with no per-level hook, so these key off the level's own class.
const DOTS = [
    "[&_[class*='pu-size:0.2']]:[--pu-size:0.16] [&_[class*='pu-size:0.2']]:bg-app-strong",
    "[&_[class*='pu-size:0.42']]:[--pu-size:0.36] [&_[class*='pu-size:0.42']]:bg-[color-mix(in_oklab,var(--pu-color)_45%,var(--color-app-fill))]",
    "[&_[class*='pu-size:0.6']]:[--pu-size:0.56] [&_[class*='pu-size:0.6']]:bg-[color-mix(in_oklab,var(--pu-color)_62%,var(--color-app-fill))]",
    "[&_[class*='pu-size:0.8']]:[--pu-size:0.78] [&_[class*='pu-size:0.8']]:bg-[color-mix(in_oklab,var(--pu-color)_80%,var(--color-app-fill))]",
].join(" ");
const LEGEND = [
    "gap-1.5 text-[13px] leading-5 [&>:first-child]:mr-0.5 [&>:last-child]:ml-0.5 [&_span_span]:size-3.5 [&_span_span]:shrink-0",
    "[&>:nth-child(2)]:w-[2.24px] [&>:nth-child(3)]:w-[5.04px] [&>:nth-child(4)]:w-[7.84px] [&>:nth-child(5)]:w-[10.92px] [&>:nth-child(6)]:w-3.5",
].join(" ");
const FIRST_DAY_ON_WEEKDAY = "[&>:first-child]:[grid-column-start:var(--first-column)]";

const SEVEN_COLUMNS = `repeat(${WEEK}, minmax(0, 1fr))`;

const weekLayout = (lead: number, days: number) => {
    const weeks = Math.ceil((lead + days) / WEEK);
    const style: CSSProperties & { "--first-column": number } = {
        "--first-column": lead + 1,
        aspectRatio: `${WIDTH} / ${weeks * TRACK - GAP}`,
        gridTemplateColumns: SEVEN_COLUMNS,
        gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))`,
    };
    return { style, width: WIDTH };
};

function useWeekLetters(firstWeekday: number) {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(LANGUAGES[localeFromParam(locale)].date, {
            timeZone: "UTC",
            weekday: "narrow",
        });
        return Array.from({ length: WEEK }, (_, index) =>
            format.format(SUNDAY_NOON + (firstWeekday - 1 + index) * DAY_MS)
        );
    }, [firstWeekday, locale]);
}

function Stat({ amount, day, label }: { amount: string; day?: string; label: string }) {
    return (
        <>
            <div className="text-muted-foreground w-0 min-w-full truncate text-[13px] leading-5">{label}</div>
            <div className="dash-figure text-base leading-6 font-medium whitespace-nowrap">{amount}</div>
            {day ? <div className="dash-figure text-muted-foreground text-xs leading-5">{day}</div> : null}
        </>
    );
}

function Month({
    children,
    days,
    filled = days.measured.length,
    gridStyle,
    letters,
}: {
    children: ReactNode;
    days: ReturnType<typeof everyDay>;
    filled?: number;
    gridStyle: CSSProperties;
    letters: string[];
}) {
    return (
        <>
            <DayGrid.Weekdays
                className="dash-figure gap-1 text-[11px] leading-4 [&>span]:justify-center"
                labels={letters}
                style={{ gridTemplateColumns: SEVEN_COLUMNS, gridTemplateRows: "none" }}
            />
            <div className="grid min-w-0 flex-1 grid-cols-1 *:self-start *:[grid-area:1/1]">
                <div aria-hidden className={`grid w-full gap-1 ${FIRST_DAY_ON_WEEKDAY}`} style={gridStyle}>
                    {days.cells.map((cell, index) => (
                        <span className="flex aspect-square items-center justify-center" key={cell.day}>
                            {index < filled ? null : (
                                <u className="border-app-ghost block size-1.5 rounded-full border" />
                            )}
                        </span>
                    ))}
                </div>
                {children}
            </div>
        </>
    );
}

export function EveryDay({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const { everyDay: copy, setup: setupCopy } = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const letters = useWeekLetters(ledger.firstWeekday);
    const days = useMemo(
        () => everyDay(ledger, filters.period, { accounts: filters.accounts }, filters.categories),
        [filters.accounts, filters.categories, filters.period, ledger]
    );
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const selectedIndex = days.measured.findIndex((cell) => cell.day === selectedDay);
    const selected = days.measured[selectedIndex];
    if (selectedDay !== null && !selected) {
        setSelectedDay(null);
    }
    const trimmed = (amount: number) => moneyIn(amount, ledger.currency, "auto", amount % 1 !== 0);
    const nameOf = (id: string | null) => {
        const category = id ? ledger.categories.get(id) : undefined;
        return category ? categoryName(category) : "";
    };
    const { style, width } = weekLayout(days.lead, days.cells.length);
    if (setup) {
        const logged = days.cells.some((cell) => cell.amount > 0);
        const emptyDayFill = logged ? "var(--color-app-ghost)" : undefined;
        return (
            <CardFrame className="min-h-[363px]" title={copy.title}>
                <div aria-hidden className="mx-auto flex max-w-full flex-col gap-1 pt-3" style={{ width }}>
                    <Month
                        days={days}
                        filled={logged ? days.measured.length : days.cells.length}
                        gridStyle={style}
                        letters={letters}
                    >
                        <div className={`grid w-full gap-1 ${FIRST_DAY_ON_WEEKDAY}`} style={style}>
                            {(logged ? days.measured : days.cells).map((cell, index) => {
                                const loggedLevel = cell.amount > 0 ? LOGGED_LEVEL : 0;
                                const level = logged ? loggedLevel : (GHOST_LEVELS[index] ?? 0);
                                const today = !logged && cell.day === ledger.today;
                                return (
                                    <span className="flex aspect-square items-center justify-center" key={cell.day}>
                                        <u
                                            className="block min-h-1 min-w-1 rounded-full border"
                                            style={{
                                                backgroundColor:
                                                    cell.amount > 0 ? "var(--color-app-tint)" : emptyDayFill,
                                                borderColor:
                                                    cell.amount > 0 || today
                                                        ? "var(--color-app-tint)"
                                                        : "var(--color-app-ghost)",
                                                height: `${(SIZES[level] ?? 0) * 100}%`,
                                                width: `${(SIZES[level] ?? 0) * 100}%`,
                                            }}
                                        />
                                    </span>
                                );
                            })}
                        </div>
                    </Month>
                </div>
                {logged ? null : <Cover fade={LATE_FADE} line={setupCopy.fillsIn} title={setupCopy.daysTitle} />}
            </CardFrame>
        );
    }
    if (quiet) {
        return (
            <CardFrame
                action={
                    <span className="dash-figure text-muted-foreground text-[13px]">
                        {copy.aDay({ amount: money(0, ledger.currency) })}
                    </span>
                }
                footer={
                    <span className="text-muted-foreground text-[13px]">
                        {copy.quietDays({ count: days.measured.length })}
                    </span>
                }
                title={copy.title}
            >
                <div className="mx-auto my-4 flex max-w-full flex-col gap-1" style={{ width }}>
                    <Month days={days} gridStyle={style} letters={letters}>
                        <DayGrid
                            aria-label={copy.quietDays({ count: days.measured.length }).value}
                            cells={days.measured.map((cell) => ({ label: date.day(cell.day), level: 0 }))}
                            className={`${DOTS} ${FIRST_DAY_ON_WEEKDAY}`}
                            columns={WEEK}
                            style={style}
                        />
                    </Month>
                </div>
            </CardFrame>
        );
    }
    const tone = categoryTone(filters.category ? ledger.categories.get(filters.category)?.color : undefined);
    const pickedStats = days.top ? (
        <>
            <Stat amount={trimmed(days.top.amount)} day={date.day(days.top.day)} label={copy.biggest.value} />
            <div className="mt-4">
                <Stat amount={String(days.entries)} label={copy.entries.value} />
            </div>
        </>
    ) : null;
    const allStats = days.top ? (
        <>
            <Stat
                amount={trimmed(days.top.amount)}
                day={date.day(days.top.day)}
                label={copy.topDay({ name: nameOf(days.top.topId) }).value}
            />
            {days.runnerUp ? (
                <div className="mt-4">
                    <Stat
                        amount={trimmed(days.runnerUp.amount)}
                        day={date.day(days.runnerUp.day)}
                        label={copy.biggestAfter.value}
                    />
                </div>
            ) : null}
        </>
    ) : null;
    const periodStats = (filters.categories.length > 0 ? pickedStats : allStats) ?? (
        <>
            <div className="text-[13px] font-medium">{copy.emptyTitle}</div>
            <div className="text-muted-foreground text-[13px]">{copy.emptyLine}</div>
        </>
    );
    return (
        <CardFrame
            action={
                <span className="dash-figure text-muted-foreground block truncate text-[13px] leading-5">
                    {copy.aDay({ amount: money(days.average, ledger.currency) })}
                </span>
            }
            footer={<DayGrid.Legend className={`${LEGEND} ${DOTS}`} less={copy.less} more={copy.more} style={tone} />}
            panelClassName="overflow-visible"
            title={copy.title}
        >
            <div className="flex flex-1 flex-wrap gap-4 p-4">
                <div className="flex flex-[9_1_140px] flex-col gap-1 self-start" style={{ maxWidth: width }}>
                    <Month days={days} gridStyle={style} letters={letters}>
                        <DayGrid
                            aria-label={copy.title.value}
                            cells={days.measured.map((cell) => ({
                                label: `${date.day(cell.day)} · ${money(cell.amount, ledger.currency)}`,
                                level: cell.level,
                            }))}
                            className={`touch-manipulation ${DOTS} ${FIRST_DAY_ON_WEEKDAY}`}
                            onValueChange={(index) => {
                                const { day } = days.measured[index] ?? {};
                                setSelectedDay(day === selectedDay ? null : (day ?? null));
                            }}
                            columns={WEEK}
                            style={{ ...style, ...tone }}
                            value={selected ? selectedIndex : null}
                        />
                    </Month>
                </div>
                <div className={`min-w-0 flex-auto ${days.runnerUp ? "min-h-36" : ""}`}>
                    <DayGrid.Caption className="gap-0 empty:hidden">
                        {selected ? (
                            <>
                                {selected.topId ? (
                                    <div className="text-muted-foreground truncate text-[13px]">
                                        {copy.topDay({ name: nameOf(selected.topId) })}
                                    </div>
                                ) : null}
                                <DayGrid.Title className="dash-figure text-base leading-6">
                                    {money(selected.amount, ledger.currency)}
                                </DayGrid.Title>
                                <DayGrid.Description className="dash-figure text-xs leading-5">
                                    {date.day(selected.day)}
                                </DayGrid.Description>
                            </>
                        ) : null}
                    </DayGrid.Caption>
                    {selected ? null : periodStats}
                </div>
            </div>
        </CardFrame>
    );
}
