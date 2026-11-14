import { proPrice } from "@outlayr/money/pro-prices";
import { Tabs } from "panelui-web/tabs";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { periodKindOf } from "@/lib/dashboard-series-period";

import { InsightsBar } from "../bar";
import { Strip } from "../flow/strip";
import type { Cell } from "../flow/strip";
import { useInsightsFormat } from "../format";
import { Card, Change } from "../parts";
import { BelowAverage, HighsAndLows, KeptCard, WhereItWent } from "./cards";
import { MonthChart } from "./chart";
import { proMultiple, runsOf, yearOf, yearsWithData } from "./model";
import type { YearModel } from "./model";
import { QuietYear } from "./quiet";

const MONTHS_IN_YEAR = 12;
const RECENT = "recent";

type Fmt = ReturnType<typeof useInsightsFormat>;

function useYear() {
    const { filters, ledger } = useDashboard();
    const { accounts, span } = filters;
    const choice = periodKindOf(span.key) === "year" ? span.key : null;
    return useMemo(() => {
        const scope = { accounts };
        const years = yearsWithData(ledger, scope);
        return {
            choice,
            model: yearOf(ledger, scope, choice, accounts.length === 0),
            years: choice !== null && !years.includes(choice) ? [choice, ...years] : years,
        };
    }, [accounts, choice, ledger]);
}

function Choice({ choice, years }: { choice: string | null; years: readonly string[] }) {
    const copy = useIntlayer("dashboard-insights-year");
    const { setFilters } = useDashboard();
    return (
        <Tabs
            onValueChange={(value: string) => setFilters({ period: value === RECENT ? null : value })}
            value={choice ?? RECENT}
            variant="segmented"
        >
            <Tabs.List aria-label={copy.seg.label.value}>
                <Tabs.Trigger value={RECENT}>{copy.seg.recent}</Tabs.Trigger>
                {years.map((year) => (
                    <Tabs.Trigger key={year} value={year}>
                        {year}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
    );
}

function useKeptNote(model: YearModel, choice: string | null, fmt: Fmt, times: number | null) {
    const copy = useIntlayer("dashboard-insights-year");
    const { keptHere: here, keptRecent: recent } = model;
    if (!here) {
        return undefined;
    }
    if (choice === null) {
        return times === null ? copy.sub.budgeted({ amount: fmt.whole(here.budgeted) }) : copy.sub.proTimes({ times });
    }
    const gap = recent ? here.kept - recent.kept : 0;
    if (gap === 0) {
        return copy.sub.budgeted({ amount: fmt.whole(here.budgeted) });
    }
    return (gap < 0 ? copy.sub.keptLess : copy.sub.keptMore)({ amount: fmt.whole(Math.abs(gap)) });
}

function useCells(model: YearModel, choice: string | null, fmt: Fmt): Cell[] {
    const copy = useIntlayer("dashboard-insights-year");
    const pro = useProMultiple(model);
    const keptText = useKeptNote(model, choice, fmt, pro?.times ?? null);
    const { months } = model;
    const logged = months.filter((month) => month.active);
    const [first] = logged;
    const last = logged.at(-1);
    const perMonth = model.monthsLogged === 0 ? 0 : Math.round(model.entries / model.monthsLogged);
    const entries: Cell = {
        label: copy.kpi.entries,
        note: copy.sub.aMonth({ count: perMonth }),
        value: model.entries,
    };
    const withYear = (key: string) => `${fmt.month(key)} ${key.slice(0, 4)}`;
    if (model.tooEarly) {
        const span = (() => {
            if (!first || !last) {
                return "";
            }
            if (first.key === last.key) {
                return withYear(first.key);
            }
            return copy.sub.pair({ from: fmt.month(first.key), to: fmt.month(last.key), year: last.key.slice(0, 4) })
                .value;
        })();
        return [
            { label: copy.kpi.soFar, note: span, value: fmt.whole(model.spent) },
            {
                label: copy.kpi.monthsLogged,
                note: first ? copy.sub.started({ month: fmt.longMonth(`${first.key}-15`) }) : undefined,
                value: copy.ofTotal({ count: model.monthsLogged, total: MONTHS_IN_YEAR }),
            },
            entries,
        ];
    }
    const judged = months.filter((month) => month.budget !== null).length;
    const runs = runsOf(model.under).map(([from, to]) => {
        const start = fmt.month(months[from]?.key ?? "");
        return from === to ? start : copy.sub.range({ from: start, to: fmt.month(months[to]?.key ?? "") }).value;
    });
    const startKey = first?.key ?? "";
    const range = copy.sub.range({
        from: choice === null && first ? withYear(startKey) : fmt.month(startKey),
        to: last ? withYear(last.key) : "",
    }).value;
    const kept = model.keptHere;
    return [
        {
            badge:
                choice !== null && model.prior ? <Change delta={model.prior.delta} goodDirection="down" /> : undefined,
            label: copy.kpi.year,
            note: choice !== null && model.prior ? copy.sub.vs({ span: range, year: Number(choice) - 1 }) : range,
            value: fmt.whole(model.spent),
        },
        {
            label: copy.kpi.kept,
            note: keptText,
            tone: kept ? undefined : "muted",
            value: kept ? fmt.whole(kept.kept) : copy.noBudgets,
        },
        {
            label: copy.kpi.months,
            note: runs.length === 0 ? undefined : runs.join(", "),
            tone: judged === 0 ? "muted" : undefined,
            value: judged === 0 ? copy.noBudgets : copy.ofTotal({ count: model.under.length, total: judged }),
        },
        entries,
    ];
}

function useProMultiple(model: YearModel) {
    const { ledger } = useDashboard();
    const price = proPrice(null, "annual");
    const times = model.keptHere ? proMultiple(model.keptHere.kept, price, ledger.currency) : null;
    return times === null ? null : { cost: price.amount, times };
}

function Grid({ choice, fmt, model }: { choice: string | null; fmt: Fmt; model: YearModel }) {
    const copy = useIntlayer("dashboard-insights-year");
    const pro = useProMultiple(model);
    const judged = model.months.filter((month) => month.budget !== null).length;
    const whereLabel = choice ?? copy.twelveMonths.value;
    return (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3 xl:grid-rows-[424px_300px]">
            <Card
                action={
                    <span className="text-muted-foreground flex items-center gap-3.5 text-xs font-normal">
                        <span className="dash-figure">{copy.legend.average({ amount: fmt.whole(model.average) })}</span>
                        {judged === 0 ? null : (
                            <>
                                <span className="flex items-center gap-1.5">
                                    <span aria-hidden className="size-2 rounded-[2px] bg-(--color-app-tint)" />
                                    {copy.legend.over}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span aria-hidden className="bg-app-strong size-2 rounded-[2px]" />
                                    {copy.legend.under}
                                </span>
                            </>
                        )}
                    </span>
                }
                className="min-h-[360px] xl:col-span-2"
                panelClassName="p-0"
                title={copy.card.month}
            >
                <MonthChart average={model.average} months={model.months} />
            </Card>
            <WhereItWent categories={model.categories} choice={choice} fmt={fmt} label={whereLabel} />
            <KeptCard choiceLabel={choice} fmt={fmt} here={model.keptHere} pro={pro} recent={model.keptRecent} />
            <BelowAverage below={model.below} fmt={fmt} latest={model.latest} />
            <HighsAndLows
                average={model.average}
                biggest={model.categories[0]}
                fmt={fmt}
                highest={model.highest}
                judged={judged}
                lowest={model.lowest}
                over={model.over}
            />
        </div>
    );
}

function Young({ fmt, model }: { fmt: Fmt; model: YearModel }) {
    const copy = useIntlayer("dashboard-insights-year");
    return (
        <>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Card className="min-h-[360px]" panelClassName="p-0" title={copy.card.month}>
                    <MonthChart average={null} months={model.months} />
                </Card>
                <WhereItWent
                    categories={model.categories}
                    choice={null}
                    fmt={fmt}
                    label={copy.monthsCount({ count: model.monthsLogged }).value}
                />
            </div>
            <Card className="mt-4" panelClassName="p-0">
                <div className="dash-empty relative isolate min-h-[295px] justify-end pb-7">
                    <QuietYear />
                    <b className="text-[15px] font-semibold">{copy.empty.title}</b>
                    <p className="text-muted-foreground text-[13px] leading-[17px]">
                        {copy.empty.line({ count: model.monthsLogged })}
                    </p>
                </div>
            </Card>
        </>
    );
}

export function YearScreen() {
    const { ledger } = useDashboard();
    const fmt = useInsightsFormat(ledger);
    const { choice, model, years } = useYear();
    const cells = useCells(model, choice, fmt);
    return (
        <>
            <InsightsBar>
                <Choice choice={choice} years={years} />
            </InsightsBar>
            <div className="mt-4">
                <Strip cells={cells} dense />
            </div>
            {model.tooEarly ? <Young fmt={fmt} model={model} /> : <Grid choice={choice} fmt={fmt} model={model} />}
        </>
    );
}
