import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Share01Icon from "@hugeicons/core-free-icons/Share01Icon";
import { proPrice } from "@outlayr/money/pro-prices";
import { Button } from "panelui-web/button";
import { useMemo, useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";

import { InsightsBar } from "../bar";
import { Strip } from "../breakdown/parts";
import type { StripFigure } from "../breakdown/parts";
import { useInsightsFormat } from "../format";
import { Card } from "../parts";
import { BudgetsButton, CAUGHT_ICONS, Caught, DaysLogged, Movers, RecapGhost, WhereItWent } from "./cards";
import type { CaughtLine, RecapFormat } from "./cards";
import { proCostIfWorth, recapOf } from "./model";
import { ShareDialog } from "./share";

const MONTHS_PER_YEAR = 12;
const PERCENT = 100;
const MONDAY_2024 = "2024-01-01";
const DAY_MS = 86_400_000;

function useClosedMonth() {
    const { filters, ledger, setFilters } = useDashboard();
    const latest = shiftPeriodKey(filters.currentKey, -1);
    const key = filters.period.key < filters.currentKey ? filters.period.key : latest;
    const month = filters.period.key === key ? filters.period : periodOf(key, ledger.firstDayOfMonth);
    const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const step = (steps: number) => setFilters({ period: shiftPeriodKey(key, steps) });
    return { atEnd: key >= latest, atStart: month.from <= earliest, month, step };
}

const toneOfChange = (percent: number) => {
    if (percent === 0) {
        return "flat";
    }
    return percent < 0 ? "good" : "poor";
};

type Copy = ReturnType<typeof useIntlayer<"dashboard-insights-recap">>;

function daysFoot(copy: Copy, empty: boolean, missing: number) {
    if (empty) {
        return copy.kpi.nothingYet;
    }
    if (missing === 0) {
        return copy.kpi.allDays;
    }
    if (missing === 1) {
        return copy.kpi.oneDayMissing;
    }
    return copy.kpi.daysMissing({ count: String(missing) });
}

function WholePill({ delta }: { delta: number }) {
    const percent = Math.round(delta * PERCENT);
    const tone = toneOfChange(percent);
    return (
        <span className="dash-trend" data-tone={tone}>
            {`${percent > 0 ? "+" : ""}${percent}%`}
        </span>
    );
}

function useFormat(): RecapFormat {
    const { ledger } = useDashboard();
    const { locale } = useLocale();
    const fmt = useInsightsFormat(ledger);
    const name = useCategoryName();
    return useMemo(() => {
        const weekday = new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "narrow" });
        return {
            amount: fmt.whole,
            categoryName: (row) => name({ id: row.id, name: row.name }),
            signed: fmt.signedWhole,
            weekday: (day) => weekday.format(new Date(Date.parse(MONDAY_2024) + (day - 1) * DAY_MS)),
        };
    }, [fmt, locale, name]);
}

function MonthControls({ month, onShare, empty }: { empty: boolean; month: Period; onShare: () => void }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights-recap");
    const stepper = useClosedMonth();
    const fmt = useInsightsFormat(ledger);
    return (
        <>
            <div className="flex items-center gap-2">
                <Button
                    aria-label={copy.month.previous.value}
                    disabled={stepper.atStart}
                    onClick={() => stepper.step(-1)}
                    size="icon-sm"
                    variant="outline"
                >
                    <Glyph icon={ArrowLeft01Icon} size={16} />
                </Button>
                <span className="dash-figure text-[13px] font-medium whitespace-nowrap">{fmt.spanName(month)}</span>
                <Button
                    aria-label={copy.month.next.value}
                    disabled={stepper.atEnd}
                    onClick={() => stepper.step(1)}
                    size="icon-sm"
                    variant="outline"
                >
                    <Glyph icon={ArrowRight01Icon} size={16} />
                </Button>
            </div>
            <Button
                className="ml-2"
                disabled={empty}
                onClick={onShare}
                style={{ background: "var(--color-app-tint)", color: "#fff" }}
            >
                <Glyph icon={Share01Icon} size={16} />
                {copy.share({ month: fmt.spanShort(month) })}
            </Button>
        </>
    );
}

export function RecapScreen() {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights-recap");
    const { open } = useAccountFlows();
    const [sharing, setSharing] = useState(false);
    const { month } = useClosedMonth();
    const format = useFormat();
    const fmt = useInsightsFormat(ledger);
    const recap = useMemo(
        () => recapOf(ledger, { accounts: filters.accounts }, month),
        [filters.accounts, ledger, month]
    );
    const prior = periodOf(shiftPeriodKey(month.key, -1), ledger.firstDayOfMonth);
    const priorName = fmt.spanShort(prior);
    const versus = copy.kpi.versus({ month: priorName }).value;
    const empty = recap.entries === 0;
    const { savings } = recap;
    const missing = recap.days.length - recap.days.filter((day) => day.logged).length;
    const logged = recap.days.length - missing;
    const monthly = proPrice(null, "annual").amount / MONTHS_PER_YEAR;
    const proCost = proCostIfWorth(
        savings.kept,
        { amount: Math.round(monthly * 100) / 100, currency: proPrice(null, "annual").currency },
        ledger.currency
    );
    const topCategory = savings.drop;

    const figures: StripFigure[] = [
        {
            foot: versus,
            label: copy.kpi.spent,
            pill: empty || recap.spentChange === null ? undefined : <WholePill delta={recap.spentChange} />,
            tone: empty ? "muted" : undefined,
            value: fmt.whole(recap.spent),
        },
        {
            foot: daysFoot(copy, empty, missing),
            label: copy.kpi.days,
            tone: empty ? "muted" : undefined,
            value: copy.kpi.daysOf({ logged: String(logged), total: String(recap.days.length) }),
        },
        {
            foot:
                savings.budgetsTotal === 0
                    ? copy.kpi.noBudgets
                    : copy.kpi.budgetsKept({
                          kept: String(savings.budgetsKept),
                          total: String(savings.budgetsTotal),
                      }),
            label: copy.kpi.under,
            tone: savings.underBudgets > 0 ? undefined : "muted",
            value: fmt.whole(savings.underBudgets),
        },
        {
            foot: topCategory ? copy.kpi.average({ amount: fmt.whole(topCategory.average) }) : copy.kpi.noAverage,
            label: topCategory ? copy.kpi.below({ name: topCategory.name }) : copy.kpi.belowPlain,
            tone: topCategory ? undefined : "muted",
            value: fmt.whole(topCategory?.amount ?? 0),
        },
    ];

    const lines: CaughtLine[] = [
        ...(savings.underBudgets > 0
            ? [
                  {
                      icon: CAUGHT_ICONS.under,
                      key: "under",
                      line: copy.caught.underLine({
                          kept: String(savings.budgetsKept),
                          names: savings.keptNames.join(", "),
                          total: String(savings.budgetsTotal),
                      }).value,
                      title: copy.caught.under,
                      value: fmt.whole(savings.underBudgets),
                  },
              ]
            : []),
        ...(topCategory
            ? [
                  {
                      icon: CAUGHT_ICONS.below,
                      key: "below",
                      line: copy.caught.belowLine({ amount: fmt.whole(topCategory.average) }).value,
                      title: `${copy.caught.below.value} ${topCategory.name}`,
                      value: fmt.whole(topCategory.amount),
                  },
              ]
            : []),
        ...(savings.over.length > 0
            ? [
                  {
                      action: <BudgetsButton>{copy.caught.seeBudgets}</BudgetsButton>,
                      icon: CAUGHT_ICONS.over,
                      key: "over",
                      line: savings.over
                          .map((each) => copy.caught.overBy({ amount: fmt.whole(each.by), name: each.name }).value)
                          .join(", "),
                      title: copy.caught.over({
                          count: String(savings.over.length),
                          total: String(savings.budgetsTotal),
                      }),
                  },
              ]
            : []),
        ...(proCost === null
            ? []
            : [
                  {
                      icon: CAUGHT_ICONS.pro,
                      key: "pro",
                      line: copy.caught.proLine({ cost: fmt.amount(proCost), kept: fmt.whole(savings.kept) }).value,
                      title: copy.caught.pro,
                  },
              ]),
    ];

    return (
        <>
            <InsightsBar>
                <MonthControls empty={empty} month={month} onShare={() => setSharing(true)} />
            </InsightsBar>
            <div className="mt-4 flex flex-col gap-4 pb-6">
                <Strip figures={figures} />
                {empty ? (
                    <Card panelClassName="p-0">
                        <div className="dash-empty relative isolate min-h-[420px] justify-end pb-[209px] lg:min-h-[734px]">
                            <RecapGhost />
                            <p className="text-[15px] font-semibold">
                                {copy.empty.title({ month: fmt.spanShort(month) })}
                            </p>
                            <p className="text-muted-foreground w-[320px] max-w-none text-[13px]">{copy.empty.line}</p>
                            <Button className="mt-2.5" onClick={() => open({ kind: "entry" })}>
                                <Glyph icon={Add01Icon} size={16} />
                                {copy.empty.add}
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:grid-rows-[366px]">
                            <WhereItWent format={format} recap={recap} versus={versus} />
                            <Movers format={format} recap={recap} versus={versus} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:grid-rows-[352px]">
                            <DaysLogged format={format} recap={recap} />
                            <Caught lines={lines} />
                        </div>
                    </>
                )}
            </div>
            <ShareDialog
                format={format}
                monthLabel={fmt.spanName(month)}
                onClose={() => setSharing(false)}
                open={sharing && !empty}
                priorName={priorName}
                recap={recap}
                whole={fmt.whole}
            />
        </>
    );
}
