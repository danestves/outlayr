import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Plot } from "panelui-web/plot";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { titled, useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import { periodOf } from "@/lib/dashboard-series-period";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { AccountsBar, Card, Cell, DataTable, EmptyAccounts, INCOME, MUTED, PERCENT, SPEND } from "./accounts-screen";
import { Glyph } from "./glyph";
import { accountRows, changeSince, monthStart, rangeDays, worthSeries } from "./model";
import type { AccountRow, WorthRange } from "./model";
import { KpiBand, KpiCell, Segments, Trend, useChartRatio } from "./parts";
import { useMonthShort, Y_LABEL } from "./worth-chart";

const CHART = 1126 / 330;
// The frames draw these pills without Kpi.Trend's arrow.
const BARE = "[&_svg]:hidden";
const NAMED = 2;
const THOUSAND = 1000;
const DAILY_TICKS = 6;

function useNetWorthModel(range: WorthRange) {
    const { ledger, overview } = useDashboard();
    return useMemo(() => {
        const days = rangeDays(ledger, range);
        // A daily range has no months to list, so the table keeps the six-month view.
        const months = range === "month" || range === "quarter" ? rangeDays(ledger, "sixMonths") : days;
        const [first = ledger.today] = months;
        const table = worthSeries(ledger, [addDays(monthStart(first), -1), ...months]);
        const [before] = worthSeries(ledger, [addDays(monthStart(ledger.today), -1)]);
        // Calendar month, to match the "in {month}" label and the month-end figures beside it.
        const period = periodOf(ledger.today.slice(0, 7), 1);
        return {
            before,
            changes: changeSince(ledger, monthStart(ledger.today)),
            figures: kpis(ledger, period, { accounts: [] }),
            points: worthSeries(ledger, days),
            rows: accountRows(ledger, overview),
            table,
        };
    }, [ledger, overview, range]);
}

type NetWorthModel = ReturnType<typeof useNetWorthModel>;

function useMoved() {
    const { net } = useIntlayer("dashboard-accounts");
    const { locale } = useLocale();
    return (rows: readonly AccountRow[], changes: ReadonlyMap<string, number>) => {
        const names = rows.filter((row) => (changes.get(row.id) ?? 0) !== 0).map((row) => row.name);
        if (names.length > NAMED) {
            return net.accounts({ count: names.length }).value;
        }
        return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
    };
}

function Note({ children, pill }: { children?: ReactNode; pill: ReactNode }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            {pill}
            <span className="text-muted-foreground truncate text-[13px]">{children}</span>
        </span>
    );
}

function Kpis({ model }: { model: NetWorthModel }) {
    const { ledger } = useDashboard();
    const { kpi, net } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const moved = useMoved();
    const { before, changes, figures, points, rows } = model;
    const { income, kept } = figures;
    const now = points.at(-1);
    const delta = (key: "net" | "owe" | "own") => (now?.[key] ?? 0) - (before?.[key] ?? 0);
    const growth = before && before.net !== 0 ? delta("net") / Math.abs(before.net) : null;
    const period = date.month(ledger.today.slice(0, 7));
    const signed = (value: number) => money(value, ledger.currency, "always");
    return (
        <KpiBand>
            <KpiCell color={INCOME} label={kpi.netWorth} value={money(now?.net ?? 0, ledger.currency)}>
                <Note
                    pill={
                        growth === null ? null : (
                            <Trend
                                className={BARE}
                                value={growth}
                            >{`${growth > 0 ? "+" : ""}${(growth * PERCENT).toFixed(1)}%`}</Trend>
                        )
                    }
                >
                    {net.inMonth({ period })}
                </Note>
            </KpiCell>
            <KpiCell color={INCOME} label={kpi.have} value={money(now?.own ?? 0, ledger.currency)}>
                <Note
                    pill={
                        <Trend className={BARE} value={delta("own")}>
                            {signed(delta("own"))}
                        </Trend>
                    }
                >
                    {moved(
                        rows.filter((row) => row.kind === "asset"),
                        changes
                    )}
                </Note>
            </KpiCell>
            <KpiCell color={SPEND} label={kpi.owe} value={money(now?.owe ?? 0, ledger.currency)}>
                <Note
                    pill={
                        <Trend className={BARE} goodWhenUp={false} value={delta("owe")}>
                            {signed(delta("owe"))}
                        </Trend>
                    }
                >
                    {moved(
                        rows.filter((row) => row.kind === "liability"),
                        changes
                    )}
                </Note>
            </KpiCell>
            <KpiCell color={INCOME} label={net.keptIn({ period })} value={money(kept.value, ledger.currency)}>
                {kept.share === null ? null : (
                    <Note pill={<Trend className={BARE} value={0}>{`${Math.round(kept.share * PERCENT)}%`}</Trend>}>
                        {net.ofIncome({ amount: money(income.value, ledger.currency) })}
                    </Note>
                )}
            </KpiCell>
        </KpiBand>
    );
}

const axis = (value: number) => (Math.abs(value) >= THOUSAND ? `${value / THOUSAND}k` : String(value));
const INTERVALS = 5;
const NICE = [1, 2, 2.5, 5, 8, 10];

/** Even steps that always land a rule on zero, where the bars meet. */
function zeroDomain(values: readonly number[]) {
    const low = Math.min(0, ...values);
    const high = Math.max(0, ...values);
    const raw = (high - low || 1) / INTERVALS;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = (NICE.find((each) => each * power >= raw) ?? 10) * power;
    const bottom = Math.floor(low / step) * step;
    const top = Math.ceil(high / step) * step;
    const domain: [number, number] = [bottom, top];
    return { domain, rows: Math.round((top - bottom) / step) };
}

function Legend({ color, label, line = false }: { color: string; label: ReactNode; line?: boolean }) {
    return (
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13px] font-normal">
            <i
                aria-hidden
                className={line ? "h-0.5 w-3 rounded-full" : "size-2 rounded-[2px]"}
                style={{ background: color }}
            />
            {label}
        </span>
    );
}

function HaveOweCard({ model, range }: { model: NetWorthModel; range: WorthRange }) {
    const { ledger } = useDashboard();
    const { kpi, net } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const month = useMonthShort();
    const monthly = range !== "month" && range !== "quarter";
    const ratio = useChartRatio(CHART);
    const data = useMemo(
        () => model.points.map((point) => ({ day: point.day, have: point.own, net: point.net, owe: -point.owe })),
        [model.points]
    );
    const { domain, rows } = zeroDomain(data.flatMap((datum) => [datum.have, datum.owe, datum.net]));
    return (
        <Card
            title={
                <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                    <span className="me-1.5">{net.haveAndOwe}</span>
                    <Legend color={`color-mix(in oklab, ${INCOME} 40%, transparent)`} label={kpi.have} />
                    <Legend color={`color-mix(in oklab, ${SPEND} 60%, transparent)`} label={kpi.owe} />
                    <Legend color="var(--color-foreground)" label={kpi.netWorth} line />
                </span>
            }
        >
            <div className="px-4 pt-4 pb-3.5">
                <Plot
                    aspectRatio={ratio}
                    curve="linear"
                    data={data}
                    label={net.haveAndOwe.value}
                    xDataKey="day"
                    yDomain={domain}
                >
                    <Plot.Grid dashArray="" rows={rows} />
                    <Plot.Rule color="var(--color-app-strong)" strokeWidth={1} y={0} />
                    <Plot.Bars color={INCOME} dataKey="have" gap={0.82} opacity={0.28} radius={4} />
                    <Plot.Bars color={SPEND} dataKey="owe" gap={0.82} opacity={0.5} radius={4} />
                    <Plot.Line color="var(--color-foreground)" dataKey="net" strokeWidth={2} />
                    <Plot.Dots color="var(--color-foreground)" dataKey="net" ringWidth={0} size={3} />
                    <Plot.XAxis
                        className="dash-figure text-[11px]"
                        format={(datum) => (monthly ? month(String(datum.day)) : date.day(String(datum.day)))}
                        ticks={monthly ? data.length : DAILY_TICKS}
                    />
                    <Plot.YAxis className={Y_LABEL} format={axis} ticks={rows} />
                    <Plot.Cursor showLine={false} />
                    <Plot.Tooltip
                        formatValue={(value, key) => money(key === "owe" ? -value : value, ledger.currency)}
                        formatX={(datum) => date.day(String(datum.day))}
                    />
                </Plot>
            </div>
        </Card>
    );
}

function MonthsCard({ model }: { model: NetWorthModel }) {
    const { ledger } = useDashboard();
    const { kpi, net } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const { locale } = useLocale();
    const year = ledger.today.slice(0, 4);
    const opened = model.rows.map((row) => row.openedDay.slice(0, 7)).toSorted()[0] ?? year;
    const rows = model.table
        .slice(1)
        .map((point, index) => ({ point, started: model.table[index]?.net ?? 0 }))
        .filter(({ point }) => point.day.slice(0, 7) >= opened)
        .toReversed();
    return (
        <Card title={net.byMonth}>
            <DataTable
                density="comfortable"
                head={[net.month, net.started, kpi.have, kpi.owe, kpi.netWorth, net.change]}
                numbers={4}
                phoneHidden={[2, 3, 4]}
            >
                {rows.map(({ point, started }) => {
                    const key = point.day.slice(0, 7);
                    const name = titled(date.month(key), locale);
                    const change = point.net - started;
                    return (
                        <Table.Row key={key}>
                            <Cell className="dash-figure">
                                {key.startsWith(year) ? name : `${name} ${key.slice(0, 4)}`}
                            </Cell>
                            <Cell className="font-normal" figure>
                                {money(started, ledger.currency)}
                            </Cell>
                            <Cell className="font-normal" figure>
                                {money(point.own, ledger.currency)}
                            </Cell>
                            <Cell className="font-normal" figure>
                                {money(point.owe, ledger.currency)}
                            </Cell>
                            <Cell figure>{money(point.net, ledger.currency)}</Cell>
                            <Cell>
                                <Trend className={BARE} value={change}>
                                    {money(change, ledger.currency, "always")}
                                </Trend>
                            </Cell>
                        </Table.Row>
                    );
                })}
            </DataTable>
        </Card>
    );
}

export function NetWorthScreen() {
    const { detail, kpi, net, range: copy } = useIntlayer("dashboard-accounts");
    const date = useDateFormat();
    const [range, setRange] = useState<WorthRange>("sixMonths");
    const model = useNetWorthModel(range);
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const zero = money(0, ledger.currency);
    return (
        <main className="@container min-w-0 px-4 pb-5 sm:px-6">
            <AccountsBar
                title={
                    <span className="flex min-w-0 items-center gap-3">
                        <Button
                            aria-label={detail.back.value}
                            nativeButton={false}
                            render={<Link to="/accounts" />}
                            size="icon"
                            variant="outline"
                        >
                            <Glyph icon={ArrowLeft02Icon} className="text-muted-foreground" />
                        </Button>
                        <span className="truncate">{kpi.netWorth}</span>
                    </span>
                }
            >
                {model.rows.length === 0 ? null : (
                    <Segments
                        onPick={setRange}
                        options={[
                            { label: copy.month, value: "month" },
                            { label: copy.quarter, value: "quarter" },
                            { label: copy.sixMonths, value: "sixMonths" },
                            { label: copy.year, value: "year" },
                            { label: copy.all, value: "all" },
                        ]}
                        value={range}
                    />
                )}
            </AccountsBar>
            {model.rows.length === 0 ? (
                <>
                    <KpiBand>
                        {[
                            kpi.netWorth,
                            kpi.have,
                            kpi.owe,
                            net.keptIn({ period: date.month(ledger.today.slice(0, 7)) }),
                        ].map((label) => (
                            <KpiCell color={MUTED} key={label.value} label={label} quiet value={zero} />
                        ))}
                    </KpiBand>
                    <div className="mt-4">
                        <EmptyAccounts />
                    </div>
                </>
            ) : (
                <>
                    <Kpis model={model} />
                    <div className="mt-4 flex flex-col gap-4">
                        <HaveOweCard model={model} range={range} />
                        <MonthsCard model={model} />
                    </div>
                </>
            )}
        </main>
    );
}
