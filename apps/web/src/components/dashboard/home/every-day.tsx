import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCategoryName, useDateFormat } from "./format";
import { everyDay } from "./model";

const SIZES = [0.16, 0.36, 0.56, 0.78, 1] as const;
const STRENGTHS = [0, 45, 62, 80, 100] as const;
const LEGEND_DOT = 14;
const WEEK = 7;
// 2024-01-01 was a Monday.
const MONDAY_NOON = Date.UTC(2024, 0, 1, 12);
const DAY_MS = 86_400_000;

const dotColor = (level: number) =>
    level === 0
        ? "var(--color-app-strong)"
        : `color-mix(in oklab, var(--color-app-tint) ${STRENGTHS[level] ?? 0}%, var(--color-app-fill))`;

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

export function EveryDay() {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").everyDay;
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const letters = useWeekLetters();
    const days = useMemo(
        () => everyDay(ledger, filters.period, { accounts: filters.accounts }, filters.categories),
        [filters.accounts, filters.categories, filters.period, ledger]
    );
    const trimmed = (amount: number) => moneyIn(amount, ledger.currency, "auto", amount % 1 !== 0);
    const top = days.top?.topId ? ledger.categories.get(days.top.topId) : undefined;
    return (
        <section className="dash-card">
            <div className="dash-card-head">
                <h2>{copy.title}</h2>
                <span className="dash-figure text-muted-foreground ml-auto text-[13px]">
                    {copy.aDay({ amount: money(days.average, ledger.currency) })}
                </span>
            </div>
            <div className="flex flex-1 gap-4 px-5 pb-[18px]">
                <div className="grid w-[222px] flex-none grid-cols-7 content-start gap-1">
                    {letters.map((letter, index) => (
                        <span
                            className="text-muted-foreground text-center font-mono text-[11px] leading-4"
                            key={`${letter}-${index}`}
                        >
                            {letter}
                        </span>
                    ))}
                    {Array.from({ length: days.lead }, (_, index) => (
                        <span key={index} />
                    ))}
                    {days.cells.map((cell) => (
                        <span
                            className="flex aspect-square items-center justify-center"
                            key={cell.day}
                            title={`${date.day(cell.day)} · ${money(cell.amount, ledger.currency)}`}
                        >
                            <u
                                className="block rounded-full"
                                style={{
                                    backgroundColor: dotColor(cell.level),
                                    boxShadow:
                                        cell.level === 4
                                            ? "0 0 14px color-mix(in oklab, var(--color-app-tint) 45%, transparent)"
                                            : undefined,
                                    height: `${(SIZES[cell.level] ?? 0) * 100}%`,
                                    width: `${(SIZES[cell.level] ?? 0) * 100}%`,
                                }}
                            />
                        </span>
                    ))}
                </div>
                {days.top ? (
                    <div className="min-w-0 flex-1">
                        <Stat
                            amount={trimmed(days.top.amount)}
                            day={date.day(days.top.day)}
                            label={copy.topDay({ name: top ? categoryName(top) : "" }).value}
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
                    </div>
                ) : (
                    <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{copy.emptyTitle}</div>
                        <div className="text-muted-foreground text-[13px]">{copy.emptyLine}</div>
                    </div>
                )}
            </div>
            <div className="dash-card-foot">
                <span className="text-muted-foreground text-[13px]">{copy.less}</span>
                <span className="flex items-center gap-1.5">
                    {SIZES.map((size, level) => (
                        <u
                            className="block rounded-full"
                            key={size}
                            style={{
                                backgroundColor: dotColor(level),
                                height: LEGEND_DOT * size,
                                width: LEGEND_DOT * size,
                            }}
                        />
                    ))}
                </span>
                <span className="text-muted-foreground text-[13px]">{copy.more}</span>
            </div>
        </section>
    );
}
