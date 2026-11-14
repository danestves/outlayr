import { useContext, useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useSampled } from "@/components/dashboard/shell/sampled";
import { categoryBudgets, kpis } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import { categorySpend } from "@/lib/dashboard-series-insights";
import { rowsBetween } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKindOf, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";
import { daysBetween } from "@/lib/ledger";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { standouts, usualSpend } from "../answers";
import type { Standout } from "../answers";
import { InsightsBar, PeriodControls } from "../bar";
import { useInsightsFormat } from "../format";
import { Change, Flat, GRID, KpiStrip, Note } from "../parts";
import type { Figure } from "../parts";
import { AnswerBones, ElseCard, HistoryCard, SubscriptionsCard, WhereCard } from "./cards";
import { categoryHistory, historySlots, paceOf, subscriptionsOf } from "./model";
import type { Pace } from "./model";
import { PaceCard } from "./pace";
import { SampleOverview } from "./sample";
import { LimitCard, QuietCard, VersusCard } from "./standout";

const HISTORY_SPANS = 5;
const SHOWN_STANDOUTS = 2;
const PACE_BAND = 0.02;
const PERCENT = 100;
const PACE_RATIO = 704 / 296;

function useOverviewModel() {
    const { filters, ledger, overview } = useDashboard();
    const { accounts, span } = filters;
    return useMemo(() => {
        const scope = { accounts };
        const kind = periodKindOf(span.key) ?? "month";
        const pace = paceOf(ledger, span, scope);
        const usual = usualSpend(ledger, span, scope);
        const budgets =
            accounts.length === 0 && kind === "month"
                ? categoryBudgets(ledger, span)
                : new Map<string, CategoryBudget>();
        const cards = standouts(ledger, span, scope, budgets, usual).slice(0, SHOWN_STANDOUTS);
        return {
            cards,
            closed: span.to < ledger.today,
            days: daysBetween(span.from, pace.through) + 1,
            entries: rowsBetween(ledger, scope, span.from, pace.through, false).length,
            figures: kpis(ledger, span, scope),
            first: ledger.rows.reduce((day, row) => (row.day < day ? row.day : day), ledger.today),
            histories: new Map(
                cards.map((card) => [
                    card.categoryId,
                    categoryHistory(ledger, span, scope, card.categoryId, HISTORY_SPANS),
                ])
            ),
            kind,
            pace,
            prior: periodOf(shiftPeriodKey(span.key, -1), ledger.firstDayOfMonth),
            slots: usual === null ? historySlots(ledger, scope, span) : null,
            spend: categorySpend(ledger, span, scope),
            subscriptions: subscriptionsOf(ledger, overview.upcoming),
        };
    }, [accounts, ledger, overview.upcoming, span]);
}

type OverviewModel = ReturnType<typeof useOverviewModel>;

function useFigures(model: OverviewModel, ledger: Ledger): Figure[] {
    const { kpi } = useIntlayer("dashboard-insights-overview");
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const fmt = useInsightsFormat(ledger);
    const { days, entries, figures, first, kind, prior } = model;
    const versus = <Note>{kpi.versus({ period: fmt.spanShort(prior) })}</Note>;
    const opening = first > prior.to ? <Note>{kpi.first[kind]}</Note> : null;
    const against = (delta: number | null, goodDirection: "down" | "up") =>
        delta === null ? (
            opening
        ) : (
            <>
                <Change delta={delta} goodDirection={goodDirection} />
                {versus}
            </>
        );
    const spent = {
        foot: against(figures.spent.delta, "down"),
        label: kpi.spent,
        value: fmt.amount(figures.spent.value),
    };
    const byDay = {
        foot: <Note>{entries === 1 ? kpi.entry : kpi.entries({ count: String(entries) })}</Note>,
        label: kpi.byDay,
        value: fmt.amount(figures.spent.value / days),
    };
    if (!incomeTracking) {
        return [spent, byDay];
    }
    return [
        spent,
        { foot: against(figures.income.delta, "up"), label: kpi.income, value: fmt.amount(figures.income.value) },
        {
            foot:
                figures.kept.share === null ? null : (
                    <>
                        <Flat>{`${Math.round(figures.kept.share * PERCENT)}%`}</Flat>
                        <Note>{kpi.ofIncome}</Note>
                    </>
                ),
            label: kpi.kept,
            value: fmt.amount(figures.kept.value),
        },
        byDay,
    ];
}

function usePaceWords(pace: Pace, span: Period, closed: boolean, ledger: Ledger) {
    const copy = useIntlayer("dashboard-insights-overview").pace;
    const fmt = useInsightsFormat(ledger);
    const amount = fmt.whole(pace.spent);
    const usual = pace.usualByNow !== null && pace.usualByNow > 0 ? pace.usualByNow : null;
    const headline = () => {
        if (pace.spent === 0) {
            return copy.nothing;
        }
        if (usual === null) {
            return (closed ? copy.closedPlain : copy.plain)({ amount });
        }
        const ratio = pace.spent / usual;
        if (ratio > 1 + PACE_BAND) {
            return closed ? copy.closedMore : copy.faster;
        }
        if (ratio < 1 - PACE_BAND) {
            return closed ? copy.closedLess : copy.slower;
        }
        return closed ? copy.closedAsUsual : copy.asUsual;
    };
    const line = () => {
        if (usual === null) {
            return copy.noUsual;
        }
        return closed
            ? copy.closedLine({ amount, period: fmt.spanShort(span), usual: fmt.whole(usual) })
            : copy.course({ amount: fmt.whole(pace.projected ?? pace.spent), usual: fmt.whole(usual) });
    };
    return { headline: headline(), line: line(), usualShown: usual !== null };
}

interface StandoutSlotProps {
    card: Standout;
    className?: string;
    model: OverviewModel;
    spanName: string;
}

function StandoutSlot({ card, className, model, spanName }: StandoutSlotProps) {
    return card.kind === "overBudget" ? (
        <LimitCard
            card={card}
            className={className}
            closed={model.closed}
            history={model.histories.get(card.categoryId) ?? []}
        />
    ) : (
        <VersusCard
            card={card}
            className={className}
            closed={model.closed}
            spanName={spanName}
            through={model.pace.through}
        />
    );
}

const ROW_HEIGHT = "lg:min-h-[312px]";

function Overview() {
    const { filters, ledger } = useDashboard();
    const { span } = filters;
    const copy = useIntlayer("dashboard-insights-overview");
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const fmt = useInsightsFormat(ledger);
    const categoryName = useCategoryName();
    const sampled = useSampled();
    const model = useOverviewModel();
    const { cards, closed, days, figures, kind, pace, slots, spend, subscriptions } = model;
    const words = usePaceWords(pace, span, closed, ledger);
    const strip = useFigures(model, ledger);
    const spanName = fmt.spanShort(span);
    const [lead, second] = slots === null ? cards : [undefined, cards[0]];
    const subscribed = subscriptions.charges.length > 0;
    const whereShown = Number(second !== undefined) + Number(subscribed) < 2;
    const lone = second === undefined && !subscribed;
    const where = spend.map((row) => ({ ...row, label: categoryName({ id: row.id, name: row.label }) }));
    const answer = () => {
        if (sampled) {
            return <AnswerBones />;
        }
        if (slots !== null) {
            return <HistoryCard line={copy.history[kind]} slots={slots} />;
        }
        return lead ? <StandoutSlot card={lead} model={model} spanName={spanName} /> : <QuietCard />;
    };
    return (
        <>
            <InsightsBar>
                <PeriodControls />
            </InsightsBar>
            <div className="mt-4">
                <KpiStrip figures={strip} />
            </div>
            <div className={`${GRID} mt-4`}>
                <PaceCard
                    aspectRatio={PACE_RATIO}
                    className="lg:col-span-2 lg:min-h-[388px]"
                    headline={words.headline}
                    label={copy.pace.chart.value}
                    line={words.line}
                    names={{ spent: spanName, usual: copy.pace.usual.value }}
                    points={pace.points}
                    tag={(amount) => (closed ? amount : copy.pace.today({ amount }))}
                    usualShown={words.usualShown}
                />
                {answer()}
            </div>
            <div className={`${GRID} mt-4 md:max-lg:grid-cols-2`}>
                {second ? (
                    <StandoutSlot card={second} className={ROW_HEIGHT} model={model} spanName={spanName} />
                ) : null}
                {whereShown ? (
                    <WhereCard className={`${ROW_HEIGHT} ${lone ? "lg:col-span-2" : ""}`} rows={where} />
                ) : null}
                {subscribed ? <SubscriptionsCard className={ROW_HEIGHT} subscriptions={subscriptions} /> : null}
                <ElseCard
                    byDay={figures.spent.value / days}
                    categories={spend.length}
                    className={ROW_HEIGHT}
                    kept={incomeTracking ? figures.kept.value : null}
                    netWorth={figures.netWorth.value}
                    year={ledger.today.slice(0, 4)}
                />
            </div>
        </>
    );
}

export function OverviewScreen() {
    const { ledger } = useDashboard();
    return ledger.rows.length === 0 ? <SampleOverview /> : <Overview />;
}
