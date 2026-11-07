import { DayGrid } from "panelui-web/day-grid";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { useCategoryName, useDateFormat } from "./format";
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
// 2024-01-01 was a Monday.
const MONDAY_NOON = Date.UTC(2024, 0, 1, 12);
const DAY_MS = 86_400_000;
const FIRST_DAY_ON_WEEKDAY = "[&>:first-child]:[grid-column-start:var(--first-column)]";
const SIX_WEEKS_TALL = "aspect-[220/188]";
const DOTS_CLEAR_OF_NEIGHBOURS = "[&>:not([aria-hidden])]:p-[18%] [&>*>span]:shadow-none";

function useWeekLetters() {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(LANGUAGES[localeFromParam(locale)].date, {
            timeZone: "UTC",
            weekday: "narrow",
        });
        return Array.from({ length: WEEK }, (_, index) => format.format(MONDAY_NOON + index * DAY_MS));
    }, [locale]);
}

function Stat({ amount, day, label }: { amount: string; day: string; label: string }) {
    return (
        <>
            <div className="text-muted-foreground truncate text-[13px]">{label}</div>
            <div className="dash-figure text-base leading-6 font-medium">{amount}</div>
            <div className="dash-figure text-muted-foreground text-xs leading-5">{day}</div>
        </>
    );
}

function Month({
    children,
    className,
    days,
    filled = days.measured.length,
}: {
    children: ReactNode;
    className: string;
    days: ReturnType<typeof everyDay>;
    filled?: number;
}) {
    const letters = useWeekLetters();
    const firstColumn: CSSProperties & { "--first-column": number } = { "--first-column": days.lead + 1 };
    return (
        <div className={className}>
            <div aria-hidden className="mb-1 grid grid-cols-7 gap-1">
                {letters.map((letter, index) => (
                    <span
                        className="text-muted-foreground text-center font-mono text-[11px] leading-4"
                        key={`${letter}-${index}`}
                    >
                        {letter}
                    </span>
                ))}
            </div>
            <div className={`grid ${SIX_WEEKS_TALL} *:self-start *:[grid-area:1/1]`} style={firstColumn}>
                <div aria-hidden className={`grid grid-cols-7 gap-1 ${FIRST_DAY_ON_WEEKDAY}`}>
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
        </div>
    );
}

export function EveryDay({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const { everyDay: copy, setup: setupCopy } = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
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
    if (setup) {
        const logged = days.cells.some((cell) => cell.amount > 0);
        const emptyDayFill = logged ? "var(--color-app-ghost)" : undefined;
        return (
            <CardFrame className="min-h-[363px]" title={copy.title}>
                <div aria-hidden>
                    <Month
                        className="mx-auto w-[220px] max-w-full pt-3"
                        days={days}
                        filled={logged ? days.measured.length : days.cells.length}
                    >
                        <div className={`grid grid-cols-7 gap-1 ${FIRST_DAY_ON_WEEKDAY}`}>
                            {(logged ? days.measured : days.cells).map((cell, index) => {
                                const loggedLevel = cell.amount > 0 ? LOGGED_LEVEL : 0;
                                const level = logged ? loggedLevel : (GHOST_LEVELS[index] ?? 0);
                                const today = !logged && cell.day === ledger.today;
                                return (
                                    <span
                                        className="flex aspect-square items-center justify-center p-[18%]"
                                        key={cell.day}
                                    >
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
                <Month className="mx-auto my-4 w-[220px] max-w-full" days={days}>
                    <DayGrid
                        aria-label={copy.quietDays({ count: days.measured.length }).value}
                        cells={days.measured.map((cell) => ({ label: date.day(cell.day), level: 0 }))}
                        className={`${DOTS_CLEAR_OF_NEIGHBOURS} ${FIRST_DAY_ON_WEEKDAY}`}
                        columns={WEEK}
                    />
                </Month>
            </CardFrame>
        );
    }
    const periodStats = days.top ? (
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
    ) : (
        <>
            <div className="text-[13px] font-medium">{copy.emptyTitle}</div>
            <div className="text-muted-foreground text-[13px]">{copy.emptyLine}</div>
        </>
    );
    return (
        <CardFrame
            action={
                <span className="dash-figure text-muted-foreground text-[13px]">
                    {copy.aDay({ amount: money(days.average, ledger.currency) })}
                </span>
            }
            footer={<DayGrid.Legend className="text-[13px]" less={copy.less} more={copy.more} />}
            panelClassName="overflow-visible"
            title={copy.title}
        >
            <div className="flex flex-1 flex-wrap gap-4 p-4">
                <Month className="max-w-[220px] flex-[9_1_160px] self-start" days={days}>
                    <DayGrid
                        aria-label={copy.title.value}
                        cells={days.measured.map((cell) => ({
                            label: `${date.day(cell.day)} · ${money(cell.amount, ledger.currency)}`,
                            level: cell.level,
                        }))}
                        className={`touch-manipulation ${DOTS_CLEAR_OF_NEIGHBOURS} ${FIRST_DAY_ON_WEEKDAY}`}
                        columns={WEEK}
                        onValueChange={(index) => {
                            const { day } = days.measured[index] ?? {};
                            setSelectedDay(day === selectedDay ? null : (day ?? null));
                        }}
                        value={selected ? selectedIndex : null}
                    />
                </Month>
                <div className={`min-w-0 flex-[1_1_96px] ${days.runnerUp ? "min-h-36" : ""}`}>
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
