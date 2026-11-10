import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import GitCompareIcon from "@hugeicons/core-free-icons/GitCompareIcon";
import { Link, getRouteApi } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Tabs } from "panelui-web/tabs";
import { useContext, useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { categoryBudgets } from "@/lib/dashboard-series";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKindOf, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { Period, PeriodKind } from "@/lib/dashboard-series-period";
import { daysBetween } from "@/lib/ledger";
import { useTagBooks } from "@/lib/ledger-db";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { InsightsBar, PeriodControls } from "../bar";
import { useInsightsFormat } from "../format";
import { Card, Change, FIGURE, Flat, onwardSearch } from "../parts";
import { CompareChart, EntriesCard, SubcategoriesCard, TagDonut, TagWeeks, TopMerchants } from "./cards";
import { StackedChart } from "./chart";
import {
    BASES,
    DIMENSIONS,
    METRICS,
    baselineOf,
    breakdownOf,
    largestMover,
    slotsOf,
    subcategoriesOf,
    tagBreakdownOf,
    weeksOf,
} from "./model";
import type { Basis, BreakdownRow, Dimension, Metric } from "./model";
import { Ghost, OpenButton, Strip } from "./parts";
import type { StripFigure } from "./parts";
import { patched, viewOf } from "./search";
import type { ViewPatch } from "./search";
import { CompareTable, GroupTable, UNTAGGED_ID } from "./tables";
import type { TableFormat } from "./tables";

const YEAR_BACK = { month: -12, week: -52, year: -1 } as const;
const route = getRouteApi("/_account/app/insights/breakdown");

const PERCENT = 100;
const DAY_ASPECT = 1118 / 326;
const SUBCATEGORY_ASPECT = 1118 / 286;
const DRILLED_ASPECT = 1118 / 290;
const TICK_EVERY = 7;
const TOP_MERCHANTS = 5;
const SENTENCE_MERCHANTS = 3;
const DOMINANT_RATIO = 2;
const WEEK_ASPECT = 480 / 190;

function dayAspect(kind: Breakdown["kind"], dimension: Dimension, drilled: boolean) {
    if (kind === "week") {
        return WEEK_ASPECT * 2;
    }
    if (drilled) {
        return DRILLED_ASPECT;
    }
    return dimension === "subcategory" ? SUBCATEGORY_ASPECT : DAY_ASPECT;
}

function usableBasis(ledger: Ledger, span: Period, kind: PeriodKind, compare: Basis | null) {
    if (compare === null) {
        return null;
    }
    return baselineOf(ledger, span, kind, compare) ? compare : "prior";
}

function useView() {
    const search = route.useSearch();
    const navigate = route.useNavigate();
    const setView = (patch: ViewPatch) =>
        navigate({ replace: true, resetScroll: false, search: (prev) => patched(prev, patch) });
    return { setView, view: viewOf(search) };
}

const goodFor = (metric: Metric) => (metric === "spent" ? "down" : "up");

function Controls({ setView, view }: ReturnType<typeof useView>) {
    const { ledger, filters, setFilters } = useDashboard();
    const copy = useIntlayer("dashboard-insights-breakdown");
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const fmt = useInsightsFormat(ledger);
    const categoryName = useCategoryName();
    const { span, category } = filters;
    const kind = periodKindOf(span.key) ?? "month";
    const chosen = category === null ? undefined : ledger.categories.get(category);
    const bases = useMemo(
        () => Object.fromEntries(BASES.map((basis) => [basis, baselineOf(ledger, span, kind, basis)])),
        [kind, ledger, span]
    );
    const label = (basis: Basis) => {
        if (basis === "average") {
            return copy.compare.average[kind].value;
        }
        const back = basis === "prior" ? -1 : YEAR_BACK[kind];
        const named = bases[basis]?.named ?? periodOf(shiftPeriodKey(span.key, back), ledger.firstDayOfMonth);
        return basis === "prior" ? fmt.spanShort(named) : fmt.spanName(named);
    };
    const active = usableBasis(ledger, span, kind, view.compare);
    const comparing = active !== null;
    const prior = bases.prior?.named;
    return (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Tabs
                onValueChange={(by: Dimension) => setView({ by: by === "category" ? null : by, tag: null })}
                value={view.dimension}
                variant="segmented"
            >
                <Tabs.List aria-label={copy.by.label.value}>
                    {DIMENSIONS.map((dimension) => (
                        <Tabs.Trigger key={dimension} value={dimension}>
                            {copy.by[dimension]}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>
            </Tabs>
            {chosen ? (
                <Chip
                    className="ml-1 gap-1.5 px-3 [&>[data-slot=chip-check]]:hidden"
                    onClick={() => setFilters({ category: null })}
                    pressed
                    size="lg"
                >
                    <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: chosen.color }} />
                    {categoryName({ id: chosen.id, name: chosen.name })}
                    <Glyph icon={Cancel01Icon} size={14} />
                    <span className="sr-only">{copy.cards.clearCategory}</span>
                </Chip>
            ) : null}
            {!comparing && !prior ? null : (
                <Chip
                    className={`gap-1.5 px-3 [&>[data-slot=chip-check]]:hidden ${chosen || comparing ? "" : "ml-1"}`}
                    onClick={() => setView({ compare: comparing ? null : "prior" })}
                    pressed={comparing}
                    size="lg"
                >
                    <Glyph icon={GitCompareIcon} size={14} />
                    {comparing || !prior ? copy.compare.chip : copy.compare.chipTo({ period: fmt.spanShort(prior) })}
                    <Glyph icon={comparing ? Cancel01Icon : ArrowDown01Icon} size={14} />
                    {comparing ? <span className="sr-only">{copy.compare.off}</span> : null}
                </Chip>
            )}
            {comparing ? (
                <Tabs
                    onValueChange={(basis: Basis) => setView({ compare: basis })}
                    value={active ?? "prior"}
                    variant="segmented"
                >
                    <Tabs.List aria-label={copy.compare.bases.value}>
                        {BASES.map((basis) => (
                            <Tabs.Trigger disabled={bases[basis] === null} key={basis} value={basis}>
                                {label(basis)}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                </Tabs>
            ) : null}
            {incomeTracking ? (
                <Tabs
                    className="ml-auto"
                    onValueChange={(metric: Metric) => setView({ show: metric === "spent" ? null : metric })}
                    value={view.metric}
                    variant="segmented"
                >
                    <Tabs.List aria-label={copy.metric.label.value}>
                        {METRICS.map((metric) => (
                            <Tabs.Trigger key={metric} value={metric}>
                                {copy.metric[metric]}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                </Tabs>
            ) : null}
        </div>
    );
}

function useBreakdown(view: ReturnType<typeof useView>["view"]) {
    const { filters, ledger } = useDashboard();
    const tags = useTagBooks();
    const { accounts, category, span } = filters;
    const kind = periodKindOf(span.key) ?? "month";
    return useMemo(() => {
        const scope = { accounts };
        const basis = usableBasis(ledger, span, kind, view.compare) ?? "prior";
        const query = { basis, category, kind, metric: view.metric };
        const baseline = baselineOf(ledger, span, kind, basis);
        const last = ledger.today < span.to ? ledger.today : span.to;
        const days = daysBetween(span.from, last) + 1;
        if (view.dimension === "tag") {
            return { baseline, days, kind, tagged: tagBreakdownOf(ledger, scope, span, query, tags) };
        }
        const grouped = breakdownOf(ledger, scope, span, { ...query, dimension: view.dimension });
        const bySlot = breakdownOf(ledger, scope, span, {
            ...query,
            dimension: "category",
        });
        const overall =
            category === null
                ? null
                : breakdownOf(ledger, scope, span, { ...query, category: null, dimension: "category" }).total;
        return { baseline, days, grouped, kind, bySlot, overall };
    }, [accounts, category, kind, ledger, span, tags, view.compare, view.dimension, view.metric]);
}

type Breakdown = ReturnType<typeof useBreakdown>;

export function BreakdownScreen() {
    const controls = useView();
    const { view } = controls;
    const data = useBreakdown(view);
    const empty = (data.tagged?.count ?? data.grouped?.count ?? 0) === 0;
    return (
        <>
            <InsightsBar>
                <PeriodControls />
            </InsightsBar>
            <Controls {...controls} />
            {empty ? <Nothing metric={view.metric} /> : <Body controls={controls} data={data} />}
        </>
    );
}

function Nothing({ metric }: { metric: Metric }) {
    const { ledger, filters } = useDashboard();
    const copy = useIntlayer("dashboard-insights-breakdown");
    const { open } = useAccountFlows();
    const fmt = useInsightsFormat(ledger);
    const kind = periodKindOf(filters.span.key) ?? "month";
    const income = useMemo(
        () =>
            ledger.rows
                .filter((row) => row.income && row.day >= filters.span.from && row.day <= filters.span.to)
                .reduce((all, row) => all + row.amount, 0),
        [filters.span, ledger.rows]
    );
    const lines = {
        income: copy.empty.nothingIncome,
        net: copy.empty.nothingNet,
        spent: copy.empty.nothingSpent[kind],
    };
    const line = lines[metric];
    return (
        <>
            <div className="mt-2.5">
                <Strip
                    figures={[
                        { label: copy.kpi.spent, tone: "muted", value: fmt.amount(0) },
                        { label: copy.kpi.entries, tone: "muted", value: "0" },
                        ...(metric === "spent" && income > 0
                            ? [{ label: copy.kpi.income, tone: "income" as const, value: fmt.signed(income) }]
                            : []),
                    ]}
                />
            </div>
            <Card className="mt-4 lg:min-h-[714px]" panelClassName="p-0">
                <div className="dash-empty relative isolate min-h-[420px] justify-end pb-[228px] lg:min-h-[692px]">
                    <Ghost />
                    <p className="text-[15px] font-semibold">{copy.empty.title}</p>
                    <p className="text-muted-foreground text-[13px]">{line}</p>
                    {metric === "spent" && income > 0 ? (
                        <p className="text-muted-foreground -mt-1.5 text-[13px]">
                            {copy.empty.income({ amount: fmt.amount(income) })}
                        </p>
                    ) : null}
                    <Button onClick={() => open({ kind: "entry" })}>
                        <Glyph icon={Add01Icon} size={16} />
                        {copy.empty.add}
                    </Button>
                </div>
            </Card>
        </>
    );
}

type Copy = ReturnType<typeof useIntlayer<"dashboard-insights-breakdown">>;

interface FiguresInput {
    baseline: boolean;
    copy: Copy;
    days: number;
    dimension: Dimension;
    fmt: FormatApi;
    grouped: NonNullable<Breakdown["grouped"]>;
    live: readonly BreakdownRow[];
    merchants: boolean;
    metric: Metric;
    money: (value: number) => string;
    percent: number | null;
    standing: { limit: number; spent: number } | undefined;
    visited: BreakdownRow | undefined;
}

function kpiFigures({
    baseline,
    copy,
    days,
    dimension,
    fmt,
    grouped,
    live,
    merchants,
    metric,
    money,
    percent,
    standing,
    visited,
}: FiguresInput) {
    const figures: StripFigure[] = [
        {
            label: copy.kpi[metric],
            pill: baseline ? <Change delta={percent} goodDirection={goodFor(metric)} /> : null,
            value: money(grouped.total),
        },
    ];
    if (merchants) {
        figures.push(
            { label: copy.kpi.merchants, value: String(live.length) },
            {
                label: copy.kpi.mostVisited,
                pill: visited ? <Flat>{String(visited.count)}</Flat> : null,
                plain: true,
                value: visited?.name ?? "",
            }
        );
    } else if (dimension === "subcategory") {
        figures.push(
            { label: copy.kpi.byDay, value: money(grouped.total / days) },
            { label: copy.kpi.subcategories, value: String(live.length) }
        );
    } else if (standing) {
        const over = standing.spent - standing.limit;
        figures.push(
            {
                label: copy.kpi.budgetLabel({ amount: fmt.whole(standing.limit) }),
                tone: over > 0 ? "poor" : undefined,
                value: (over > 0 ? copy.kpi.over : copy.kpi.left)({ amount: fmt.amount(Math.abs(over)) }),
            },
            { label: copy.kpi.entries, value: String(grouped.count) }
        );
    } else {
        figures.push(
            { label: copy.kpi.byDay, value: money(grouped.total / days) },
            { label: copy.kpi.entries, value: String(grouped.count) }
        );
    }
    return figures;
}

function merchantSentence({
    copy,
    dominant,
    first,
    period,
    topOf,
    topShare,
}: {
    copy: Copy;
    dominant: boolean;
    first: BreakdownRow | undefined;
    period: string;
    topOf: (row: BreakdownRow) => { name: string };
    topShare: number;
}) {
    return (dominant ? copy.line.top : copy.line.topPlain)({
        count: String(SENTENCE_MERCHANTS),
        period,
        share: `${topShare}%`,
        skipped: first ? topOf(first).name.toLowerCase() : "",
    });
}

interface BodyProps {
    controls: ReturnType<typeof useView>;
    data: Breakdown;
}

function Body({ controls, data }: BodyProps) {
    const { setView, view } = controls;
    const { filters, ledger, setFilters } = useDashboard();
    const copy = useIntlayer("dashboard-insights-breakdown");
    const fmt = useInsightsFormat(ledger);
    const categoryName = useCategoryName();
    const { span, category } = filters;
    const { baseline, days, kind } = data;
    const { metric } = view;
    const money = (value: number) => (metric === "net" ? fmt.signed(value) : fmt.amount(value));
    const against = baseline?.named ? fmt.spanShort(baseline.named) : copy.compare.average[kind].value;
    const topOf = (row: BreakdownRow) => {
        const top = ledger.categories.get(row.categoryId);
        return { color: top?.color ?? "", name: categoryName({ id: row.categoryId, name: top?.name ?? "" }) };
    };
    const format: TableFormat = {
        amount: money,
        categoryName: (row) =>
            view.dimension === "category" || row.id === UNCATEGORIZED_ID
                ? categoryName({ id: row.id === UNCATEGORIZED_ID ? row.id : row.categoryId, name: row.name })
                : row.name,
        delta: fmt.signed,
        topCategory: topOf,
    };
    const open = (row: BreakdownRow) => {
        if (view.dimension === "tag") {
            setView({ tag: row.id });
            return;
        }
        setFilters({ category: row.categoryId === UNCATEGORIZED_ID ? null : row.categoryId });
    };
    if (data.tagged) {
        return (
            <TagBody
                data={data.tagged}
                format={format}
                fmt={fmt}
                against={against}
                baseline={baseline}
                setView={setView}
                view={view}
            />
        );
    }
    const { bySlot, grouped, overall } = data;
    const comparing = view.compare !== null && baseline !== null;
    const delta = baseline ? grouped.total - (grouped.baseTotal ?? 0) : null;
    const percent = delta === null || !grouped.baseTotal ? null : delta / Math.abs(grouped.baseTotal);
    const mover = largestMover(grouped.rows);
    const sentence = (() => {
        if (delta === null || delta === 0 || mover === null) {
            return null;
        }
        const verb = mover.delta > 0 === delta > 0 ? copy.line.added : copy.line.took;
        return (
            <>
                {category === null || overall === null || overall === 0
                    ? null
                    : `${
                          copy.line.share({
                              period: fmt.spanShort(span),
                              share: `${Math.round((Math.abs(grouped.total) / Math.abs(overall)) * PERCENT)}%`,
                          }).value
                      } `}
                {(delta > 0 ? copy.line.more : copy.line.less)({
                    amount: fmt.amount(Math.abs(delta)),
                    period: against,
                })}{" "}
                {category === null
                    ? copy.line.alone({
                          amount: fmt.amount(Math.abs(mover.delta)),
                          name: format.categoryName(mover),
                          verb: verb.value,
                      })
                    : null}
            </>
        );
    })();
    const standing =
        category !== null && filters.accounts.length === 0 && kind === "month"
            ? categoryBudgets(ledger, span).get(category)
            : undefined;
    const drilled = category !== null && view.dimension === "category";
    const merchants = view.dimension === "merchant";
    const live = grouped.rows.filter((row) => row.count > 0);
    const sorted = live;
    const dominant =
        merchants &&
        sorted.length > 1 &&
        Math.abs(sorted[0]?.amount ?? 0) > Math.abs(sorted[1]?.amount ?? 0) * DOMINANT_RATIO;
    const [first] = sorted;
    const topList = sorted.slice(dominant ? 1 : 0, (dominant ? 1 : 0) + TOP_MERCHANTS);
    const [visited] = live.toSorted((a, b) => b.count - a.count);
    const topShare = (() => {
        const rest = sorted
            .slice(dominant ? 1 : 0, (dominant ? 1 : 0) + SENTENCE_MERCHANTS)
            .reduce((all, row) => all + Math.abs(row.amount), 0);
        return grouped.total === 0 ? 0 : Math.round((rest / Math.abs(grouped.total)) * PERCENT);
    })();
    const figures = kpiFigures({
        baseline: baseline !== null,
        copy,
        dimension: view.dimension,
        fmt,
        grouped,
        live,
        merchants,
        metric,
        money,
        days,
        percent,
        standing,
        visited,
    });
    const compared: StripFigure[] = [
        { label: fmt.spanShort(span), value: money(grouped.total) },
        { label: against, value: money(grouped.baseTotal ?? 0) },
        {
            label: copy.compare.change,
            pill: <Change delta={percent} goodDirection={goodFor(metric)} />,
            value: fmt.signed(delta ?? 0),
        },
    ];
    const merchantLine = merchants
        ? merchantSentence({
              copy,
              dominant,
              first: dominant ? first : undefined,
              period: fmt.spanShort(span),
              topOf,
              topShare,
          })
        : null;
    const subsLine =
        view.dimension === "subcategory" && mover
            ? copy.line.alone({
                  amount: fmt.amount(Math.abs(mover.delta)),
                  name: mover.name,
                  verb: copy.line.added.value,
              })
            : null;
    return (
        <>
            <div className="mt-2.5">
                <Strip figures={comparing ? compared : figures} sentence={merchantLine ?? subsLine ?? sentence} />
            </div>
            {comparing ? (
                <Comparing
                    against={against}
                    fmt={fmt}
                    format={format}
                    grouped={grouped}
                    metric={metric}
                    span={fmt.spanShort(span)}
                />
            ) : (
                <>
                    {merchants ? null : (
                        <Daily data={data} dimension={view.dimension} drilled={drilled} fmt={fmt} money={money} />
                    )}
                    {merchants ? (
                        <div className="mt-4">
                            <TopMerchants format={money} onOpen={open} rows={topList} />
                        </div>
                    ) : null}
                    {drilled ? null : (
                        <Card className="mt-4" panelClassName="p-0">
                            <GroupTable
                                baseTotal={grouped.baseTotal}
                                count={grouped.count}
                                dimension={view.dimension}
                                format={format}
                                metric={metric}
                                onOpen={open}
                                rows={grouped.rows}
                                total={grouped.total}
                                versus={copy.table.versus({ period: against }).value}
                            />
                        </Card>
                    )}
                </>
            )}
            {comparing ? null : <Selected bySlot={bySlot} />}
        </>
    );
}

interface FormatApi {
    amount: (value: number) => string;
    compact: (value: number) => string;
    date: (value: string) => string;
    axis: (value: number) => string;
    month: (value: string) => string;
    signed: (value: number) => string;
    whole: (value: number) => string;
}

function Comparing({
    against,
    fmt,
    format,
    grouped,
    metric,
    span,
}: {
    against: string;
    fmt: FormatApi;
    format: TableFormat;
    grouped: { baseTotal: number | null; rows: readonly BreakdownRow[]; total: number };
    metric: Metric;
    span: string;
}) {
    const copy = useIntlayer("dashboard-insights-breakdown");
    const rows = grouped.rows.filter((row) => row.count > 0 || row.base > 0);
    const baseTotal = grouped.baseTotal ?? 0;
    return (
        <>
            <Card
                action={
                    <span className="text-muted-foreground flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                            <span className="bg-app-strong size-2.5 rounded-[3px]" />
                            {against}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="bg-foreground size-2.5 rounded-[3px]" />
                            {copy.compare.current({ period: span })}
                        </span>
                    </span>
                }
                className="mt-4"
                panelClassName="px-5 pt-0 pb-[13px]"
                title={copy.compare.title({ base: against, current: span })}
            >
                <CompareChart
                    baseLabel={against}
                    compact={fmt.compact}
                    whole={fmt.whole}
                    currentLabel={span}
                    format={format.amount}
                    rows={rows}
                />
            </Card>
            <Card className="mt-4" panelClassName="p-0">
                <CompareTable
                    baseLabel={against}
                    baseTotal={baseTotal}
                    currentLabel={span}
                    format={format}
                    metric={metric}
                    rows={rows}
                    total={grouped.total}
                />
            </Card>
        </>
    );
}

function Daily({
    data,
    dimension,
    drilled,
    fmt,
    money,
}: {
    data: Breakdown;
    dimension: Dimension;
    drilled: boolean;
    fmt: FormatApi;
    money: (value: number) => string;
}) {
    const { ledger, filters } = useDashboard();
    const copy = useIntlayer("dashboard-insights-breakdown");
    const { span } = filters;
    const { bySlot, days, kind } = data;
    const slots = useMemo(
        () => (bySlot ? slotsOf(ledger, span, bySlot.flows, bySlot.keyOf, bySlot.rows) : []),
        [bySlot, ledger, span]
    );
    if (!bySlot) {
        return null;
    }
    const [peak] = slots.toSorted((a, b) => Math.abs(b.total) - Math.abs(a.total));
    const [lead] = peak?.parts.toSorted((a, b) => Math.abs(b.value) - Math.abs(a.value)) ?? [];
    const single = bySlot.rows.filter((row) => row.count > 0).length === 1;
    const when = (slot: { from: string }) => (kind === "year" ? fmt.month(slot.from.slice(0, 7)) : fmt.date(slot.from));
    const action = (() => {
        if (single) {
            return copy.cards.perDay({ amount: money(bySlot.total / days) });
        }
        if (!peak || peak.total === 0) {
            return null;
        }
        const props = { amount: fmt.whole(Math.abs(peak.total)), date: when(peak) };
        return lead ? copy.cards.peak({ ...props, name: lead.name.toLowerCase() }) : copy.cards.peakPlain(props);
    })();
    return (
        <Card
            action={
                action ? (
                    <span className={`${FIGURE} text-muted-foreground text-[13px] leading-6`}>{action}</span>
                ) : null
            }
            className="mt-4"
            panelClassName="px-5 pt-0 pb-[11px]"
            title={kind === "year" ? copy.cards.byMonth : copy.cards.byDay}
        >
            <StackedChart
                aspect={dayAspect(kind, dimension, drilled)}
                format={fmt.compact}
                label={kind === "year" ? copy.chart.labelMonth.value : copy.chart.label.value}
                labelOf={(slot) => `${when(slot)} ${money(slot.total)}`}
                renderTip={(slot) => (
                    <div className="flex flex-col gap-1">
                        <p className={`${FIGURE} font-medium`}>
                            {when(slot)} {money(slot.total)}
                        </p>
                        {slot.parts.map((part) => (
                            <p className="flex items-center gap-2" key={part.id}>
                                <span className="size-2 rounded-[2px]" style={{ background: part.color }} />
                                <span className="truncate">{part.name}</span>
                                <span className={`${FIGURE} ml-auto pl-3`}>{money(part.value)}</span>
                            </p>
                        ))}
                    </div>
                )}
                slots={slots}
                ticks={(slot, index) => {
                    if (kind === "year") {
                        return fmt.month(slot.from.slice(0, 7));
                    }
                    return kind === "week" || index % TICK_EVERY === 0 ? when(slot) : null;
                }}
            />
        </Card>
    );
}

function Selected({ bySlot }: { bySlot: Breakdown["bySlot"] }) {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights-breakdown");
    const fmt = useInsightsFormat(ledger);
    const { category } = filters;
    const chosen = category === null ? undefined : ledger.categories.get(category);
    const subs = useMemo(() => (bySlot ? subcategoriesOf(ledger, bySlot.flows) : []), [bySlot, ledger]);
    if (!bySlot || !chosen || category === null) {
        return null;
    }
    const names = new Map(ledger.books.categories.map((row) => [row.localId, row.name]));
    const accountName = (id: string | null) => ledger.books.accounts.find((row) => row.localId === id)?.name ?? "";
    return (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
            <SubcategoriesCard
                categoryId={category}
                color={chosen.color}
                format={fmt.amount}
                name={chosen.name}
                rows={subs}
            />
            <EntriesCard
                accountName={accountName}
                action={{ label: copy.cards.seeAll({ count: String(bySlot.count) }).value, to: "/app/transactions" }}
                categoryId={category}
                dateOf={fmt.date}
                flows={bySlot.flows}
                format={fmt.signed}
                subName={(row) => (row.categoryId === null ? chosen.name : (names.get(row.categoryId) ?? chosen.name))}
            />
        </div>
    );
}

interface TagBodyProps {
    against: string;
    baseline: Breakdown["baseline"];
    data: NonNullable<Breakdown["tagged"]>;
    fmt: ReturnType<typeof useInsightsFormat>;
    format: TableFormat;
    setView: ReturnType<typeof useView>["setView"];
    view: ReturnType<typeof useView>["view"];
}

function TagBody({ against, baseline, data, fmt, format, setView, view }: TagBodyProps) {
    const copy = useIntlayer("dashboard-insights-breakdown");
    const { ledger, filters } = useDashboard();
    const { span } = filters;
    const { metric } = view;
    const money = (value: number) => (metric === "net" ? fmt.signed(value) : fmt.amount(value));
    const share = data.total === 0 ? 0 : Math.round((Math.abs(data.tagged) / Math.abs(data.total)) * PERCENT);
    const mover = largestMover(data.rows);
    const chosen = data.rows.find((row) => row.id === view.tag) ?? data.rows[0];
    const weeks = useMemo(
        () => (chosen ? weeksOf(ledger, span, data.split.byTag.get(chosen.id) ?? [], 1) : []),
        [chosen, data.split.byTag, ledger, span]
    );
    const sentence =
        baseline && mover
            ? (mover.delta > 0 ? copy.line.tag : copy.line.tagLess)({
                  amount: fmt.amount(Math.abs(mover.delta)),
                  period: against,
                  tag: `#${mover.name}`,
              })
            : null;
    const figures: StripFigure[] = [
        { label: copy.kpi.tagged, pill: <Flat>{`${share}%`}</Flat>, value: money(data.tagged) },
        { label: copy.kpi.untagged, value: money(data.untagged) },
        { label: copy.kpi.tagsUsed, value: String(data.rows.length) },
    ];
    const untaggedBase = data.baseTotal === null || data.baseTagged === null ? 0 : data.baseTotal - data.baseTagged;
    const rows: BreakdownRow[] = [
        ...data.rows,
        {
            amount: data.untagged,
            base: untaggedBase,
            categoryId: UNCATEGORIZED_ID,
            color: "var(--color-app-ghost)",
            count: data.split.untagged.length,
            delta: data.untagged - untaggedBase,
            id: UNTAGGED_ID,
            name: copy.table.untagged.value,
            parent: null,
            percent: untaggedBase === 0 ? null : (data.untagged - untaggedBase) / Math.abs(untaggedBase),
        },
    ];
    const open = (row: BreakdownRow) => setView({ tag: row.id });
    const comparing = view.compare !== null && baseline !== null;
    return (
        <>
            <div className="mt-2.5">
                <Strip figures={figures} sentence={sentence} />
            </div>
            {comparing ? (
                <Comparing
                    against={against}
                    fmt={fmt}
                    format={format}
                    grouped={{ baseTotal: data.baseTotal, rows, total: data.total }}
                    metric={metric}
                    span={fmt.spanShort(span)}
                />
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                        <TagDonut
                            of={copy.chart.ofTotal({ amount: money(data.total) }).value}
                            onSelect={(tag) => setView({ tag })}
                            parts={data.rows}
                            tagged={fmt.whole(data.tagged)}
                        />
                        {chosen ? (
                            <Card
                                action={
                                    <OpenButton
                                        render={
                                            <Link search={onwardSearch("/app/transactions")} to="/app/transactions" />
                                        }
                                    >
                                        {copy.cards.openTag}
                                    </OpenButton>
                                }
                                panelClassName="px-5 pt-0 pb-[15px]"
                                title={copy.cards.tagByWeek({ tag: `#${chosen.name}` })}
                            >
                                <TagWeeks
                                    color={chosen.color}
                                    compact={fmt.compact}
                                    label={copy.cards.tagByWeek({ tag: chosen.name }).value}
                                    rangeOf={(week) =>
                                        copy.chart.weekRange({
                                            from: fmt.date(week.label.from),
                                            to: fmt.date(week.label.to),
                                        }).value
                                    }
                                    weeks={weeks}
                                    whole={fmt.whole}
                                />
                            </Card>
                        ) : null}
                    </div>
                    <Card className="mt-4" panelClassName="p-0">
                        <GroupTable
                            baseTotal={data.baseTotal === null ? null : data.baseTotal}
                            count={data.count}
                            dimension="tag"
                            format={format}
                            metric={metric}
                            onOpen={open}
                            rows={rows}
                            total={data.total}
                            versus={copy.table.versus({ period: against }).value}
                        />
                    </Card>
                </>
            )}
        </>
    );
}
