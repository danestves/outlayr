import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import { wallNoon } from "@outlayr/money/ledger-zone";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { DayGrid } from "panelui-web/day-grid";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { rangeKindOf } from "@/lib/dashboard-series-period";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { Empty } from "./empty";
import { categoryTone, useCategoryName, useDateFormat, useWholeMoney } from "./format";
import { dayEntries, everyDay, everyMonth, monthsOf } from "./model";
import type { SetupState } from "./model";

const WEEK = 7;
const PERCENT = 100;
const CARD_ENTRIES = 3;
const EDGE = 0.25;
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
    "text-app-label gap-1.5 [&>:first-child]:mr-0.5 [&>:last-child]:ml-0.5 [&_span_span]:size-3.5 [&_span_span]:shrink-0",
    "[&>:nth-child(2)]:w-[2.24px] [&>:nth-child(3)]:w-[5.04px] [&>:nth-child(4)]:w-[7.84px] [&>:nth-child(5)]:w-[10.92px] [&>:nth-child(6)]:w-3.5",
].join(" ");
// The card below replaces the part's one-line tag.
const NO_TAG = "[&>span.absolute]:hidden";

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

function useMonthName(width: "narrow" | "short") {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(LANGUAGES[localeFromParam(locale)].date, {
            month: width,
            timeZone: "UTC",
        });
        return (key: string) => format.format(wallNoon(`${key.slice(0, 7)}-15`)).replace(".", "");
    }, [locale, width]);
}

function Stat({ amount, day, label }: { amount: string; day?: string; label: string }) {
    return (
        <div className="not-first:mt-4">
            <div className="text-muted-foreground text-app-label w-0 min-w-full truncate">{label}</div>
            <div className="dash-figure text-app-title font-medium whitespace-nowrap">{amount}</div>
            {day ? <div className="dash-figure text-muted-foreground text-app-caption">{day}</div> : null}
        </div>
    );
}

interface Pointed {
    index: number;
    left: number;
    share: number;
    top: number;
}

function DayCard({ amount, day, pointed }: { amount: number; day: string; pointed: Pointed }) {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").everyDay;
    const date = useDateFormat();
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const entries = useMemo(
        () => dayEntries(ledger, day, { accounts: filters.accounts }, filters.categories),
        [day, filters.accounts, filters.categories, ledger]
    );
    let shift = "-50%";
    if (pointed.share < EDGE) {
        shift = "-12%";
    } else if (pointed.share > 1 - EDGE) {
        shift = "-88%";
    }
    return (
        <div
            aria-hidden
            className="bg-popover text-popover-foreground border-border rounded-app-lg pointer-events-none absolute z-30 mt-1.5 w-56 border p-3 shadow-(--shadow-app-popover)"
            style={{ left: pointed.left, top: pointed.top, translate: `${shift} 0` }}
        >
            <div className="text-app-caption text-muted-foreground flex justify-between gap-2">
                <span className="dash-figure">{date.weekday(day)}</span>
                <span>{entries.length === 1 ? copy.oneEntry : copy.manyEntries({ count: entries.length })}</span>
            </div>
            <div className="dash-figure text-app-heading mt-1 font-semibold">{money(amount, ledger.currency)}</div>
            {entries.slice(0, CARD_ENTRIES).map((entry) => {
                const category = ledger.categories.get(entry.topId);
                return (
                    <div className="text-app-label mt-1.5 flex items-center gap-2" key={entry.id}>
                        <u
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: category?.color ?? "var(--color-app-strong)" }}
                        />
                        <span className="min-w-0 truncate">
                            {entry.note || (category ? categoryName(category) : "")}
                        </span>
                        <span className="dash-figure ms-auto">{money(entry.amount, ledger.currency)}</span>
                    </div>
                );
            })}
        </div>
    );
}

function Days({ days, quiet }: { days: ReturnType<typeof everyDay>; quiet: boolean }) {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").everyDay;
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const letters = useWeekLetters(ledger.firstWeekday);
    const monthName = useMonthName("short");
    const box = useRef<HTMLDivElement>(null);
    const [pointed, setPointed] = useState<Pointed | null>(null);
    const quarter = rangeKindOf(filters.range.key) === "quarter";
    const tone = categoryTone(filters.category ? ledger.categories.get(filters.category)?.color : undefined);
    const point = (button: HTMLElement | null | undefined) => {
        const wide = box.current?.offsetWidth ?? 0;
        const index = button
            ? [...(button.parentElement?.querySelectorAll(":scope > button") ?? [])].indexOf(button)
            : -1;
        if (!button || index < 0 || (days.cells[index]?.amount ?? 0) <= 0 || wide === 0) {
            setPointed(null);
            return;
        }
        const left = button.offsetLeft + button.offsetWidth / 2;
        setPointed((last) =>
            last?.index === index
                ? last
                : { index, left, share: left / wide, top: button.offsetTop + button.offsetHeight }
        );
    };
    const pointedCell = pointed ? days.cells[pointed.index] : undefined;
    const weeks = Math.ceil((days.lead + days.cells.length) / WEEK);
    const monthStarts = quarter
        ? monthsOf(ledger, filters.range).map((month) => ({
              column: Math.floor((days.lead + days.cells.findIndex((cell) => cell.day === month.from)) / WEEK) + 1,
              key: month.key,
          }))
        : [];
    const columns: CSSProperties = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` };
    const cells = days.cells.map((cell, index) => ({
        label: `${date.day(cell.day)} · ${money(cell.amount, ledger.currency)}`,
        level: index < days.measured.length && !quiet ? cell.level : 0,
    }));
    return (
        <div className="flex flex-col gap-1">
            {quarter ? (
                <div className="dash-figure text-muted-foreground text-app-micro grid gap-1" style={columns}>
                    {monthStarts.map((month) => (
                        <span className="whitespace-nowrap" key={month.key} style={{ gridColumnStart: month.column }}>
                            {monthName(month.key)}
                        </span>
                    ))}
                </div>
            ) : (
                <DayGrid.Weekdays
                    className="dash-figure text-app-micro grid-cols-7 grid-rows-none! gap-1 [&>span]:justify-center"
                    labels={letters}
                />
            )}
            <div className="relative" ref={box}>
                <DayGrid
                    aria-label={copy.title.value}
                    cells={cells}
                    className={`touch-manipulation ${DOTS} ${NO_TAG}`}
                    columns={quarter ? undefined : WEEK}
                    offset={days.lead}
                    onPointerLeave={() => setPointed(null)}
                    onPointerMove={(event) => {
                        const { target } = event;
                        point(target instanceof Element ? target.closest("button") : null);
                    }}
                    onValueChange={quiet ? undefined : (index) => point(box.current?.querySelectorAll("button")[index])}
                    rows={quarter ? WEEK : undefined}
                    style={tone}
                    value={pointed?.index ?? null}
                />
                {pointed && pointedCell ? (
                    <DayCard amount={pointedCell.amount} day={pointedCell.day} pointed={pointed} />
                ) : null}
            </div>
        </div>
    );
}

function EveryMonth() {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").everyDay;
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(ledger.currency);
    const letter = useMonthName("narrow");
    const short = useMonthName("short");
    const months = useMemo(
        () => everyMonth(ledger, filters.range, { accounts: filters.accounts }, filters.categories),
        [filters.accounts, filters.categories, filters.range, ledger]
    );
    const tallest = Math.max(...months.months.map((month) => month.amount), 1);
    const last = filters.range.key.slice(0, 7);
    const color = filters.category ? ledger.categories.get(filters.category)?.color : undefined;
    const bar: CSSProperties & { "--bar": string } = { "--bar": color ?? "var(--color-app-tint)" };
    return (
        <CardFrame
            action={
                <span className="dash-figure text-muted-foreground text-app-label block truncate">
                    {copy.aDay({ amount: money(months.average, ledger.currency) })}
                </span>
            }
            footer={
                <>
                    {months.highest ? (
                        <span className="flex items-baseline gap-1.5">
                            <span className="text-muted-foreground">{copy.highest}</span>
                            <span className="dash-figure font-medium">{whole(months.highest.amount)}</span>
                            <span className="dash-figure text-muted-foreground">{short(months.highest.key)}</span>
                        </span>
                    ) : null}
                    {months.lowest ? (
                        <span className="ms-auto flex items-baseline gap-1.5">
                            <span className="text-muted-foreground">{copy.lowest}</span>
                            <span className="dash-figure font-medium">{whole(months.lowest.amount)}</span>
                            <span className="dash-figure text-muted-foreground">{short(months.lowest.key)}</span>
                        </span>
                    ) : null}
                </>
            }
            title={copy.monthTitle}
        >
            <div className="flex flex-1 flex-col p-4" style={bar}>
                <div className="flex min-h-40 flex-1 items-end gap-1.5">
                    {months.months.map((month) => (
                        <span
                            className={`rounded-app-xs block flex-1 ${month.key === last ? "bg-(--bar)" : "bg-[color-mix(in_oklab,var(--bar)_55%,var(--color-app-fill))]"} ${month.amount > 0 ? "" : "bg-app-strong! h-0.5"}`}
                            key={month.key}
                            style={month.amount > 0 ? { height: `${(month.amount / tallest) * PERCENT}%` } : undefined}
                        >
                            <span className="sr-only">{`${short(month.key)} · ${whole(month.amount)}`}</span>
                        </span>
                    ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                    {months.months.map((month) => (
                        <span
                            className="dash-figure text-muted-foreground text-app-micro flex-1 text-center"
                            key={month.key}
                        >
                            {letter(month.key)}
                        </span>
                    ))}
                </div>
            </div>
        </CardFrame>
    );
}

export function EveryDay({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const { everyDay: copy, setup: setupCopy } = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const days = useMemo(
        () => everyDay(ledger, filters.range, { accounts: filters.accounts }, filters.categories),
        [filters.accounts, filters.categories, filters.range, ledger]
    );
    if (setup && !setup.done.entry) {
        return (
            <CardFrame title={copy.title}>
                <Empty icon={Calendar03Icon} line={setupCopy.fillsIn} title={setupCopy.daysTitle} />
            </CardFrame>
        );
    }
    if (!quiet && rangeKindOf(filters.range.key) === "year") {
        return <EveryMonth />;
    }
    const trimmed = (amount: number) => moneyIn(amount, ledger.currency, "auto", amount % 1 !== 0);
    const nameOf = (id: string | null) => {
        const category = id ? ledger.categories.get(id) : undefined;
        return category ? categoryName(category) : "";
    };
    const aDay = (
        <span className="dash-figure text-muted-foreground text-app-label block truncate">
            {copy.aDay({ amount: money(days.average, ledger.currency) })}
        </span>
    );
    if (quiet) {
        return (
            <CardFrame
                action={aDay}
                footer={
                    <span className="text-muted-foreground">{copy.quietDays({ count: days.measured.length })}</span>
                }
                title={copy.title}
            >
                <div className="mx-auto w-full max-w-56 p-4">
                    <Days days={days} quiet />
                </div>
            </CardFrame>
        );
    }
    const picked = filters.categories.length > 0;
    let stats = (
        <>
            <div className="text-app-label font-medium">{copy.emptyTitle}</div>
            <div className="text-muted-foreground text-app-label">{copy.emptyLine}</div>
        </>
    );
    if (days.top) {
        stats = (
            <>
                <Stat
                    amount={trimmed(days.top.amount)}
                    day={date.day(days.top.day)}
                    label={picked ? copy.biggest.value : copy.topDay({ name: nameOf(days.top.topId) }).value}
                />
                {picked ? <Stat amount={String(days.entries)} label={copy.entries.value} /> : null}
                {!picked && days.runnerUp ? (
                    <Stat
                        amount={trimmed(days.runnerUp.amount)}
                        day={date.day(days.runnerUp.day)}
                        label={copy.biggestAfter.value}
                    />
                ) : null}
            </>
        );
    }
    const quarter = rangeKindOf(filters.range.key) === "quarter";
    return (
        <CardFrame
            action={aDay}
            footer={
                <DayGrid.Legend
                    className={`${LEGEND} ${DOTS}`}
                    less={copy.less}
                    more={copy.more}
                    style={categoryTone(filters.category ? ledger.categories.get(filters.category)?.color : undefined)}
                />
            }
            panelClassName="overflow-visible"
            title={copy.title}
        >
            <div className="flex flex-1 flex-wrap gap-4 p-4">
                <div className={`min-w-0 grow self-start ${quarter ? "max-w-72 basis-48" : "max-w-56 basis-36"}`}>
                    <Days days={days} quiet={false} />
                </div>
                <div className="min-w-24 flex-1">{stats}</div>
            </div>
        </CardFrame>
    );
}
