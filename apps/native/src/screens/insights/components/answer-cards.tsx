import { windowEndMs } from "@outlayr/money/budget-window";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";
import { valueDatedRowsIn } from "@outlayr/money/valuation";
import { useRouter } from "expo-router";

import { useBudgetContributions } from "@/data/budgets";
import { windowShortLabel, windowStart } from "@/data/insights";
import type { CategoryMeta, InsightsCalendar, InsightsPeriod } from "@/data/insights";
import type { SubscriptionDetail } from "@/data/use-insights-answers";
import { useValuation } from "@/data/use-valuation";
import type { Database } from "@/db/client";
import { formatSentenceDate, monthAbbrevTitle } from "@/domain/dates";
import type { AnswerCard as AnswerCardData } from "@/domain/insights-answers";
import { useLanguage, useTranslation } from "@/i18n/context";

import { AnswerCard } from "./answer-card";
import { LimitBars, ProofRows, UsualBars } from "./answer-proofs";
import { useMoney } from "./use-money";
import type { Money } from "./use-money";

const SUBSCRIPTION_ROWS = 4;

export interface CardsContext {
    barName: string;
    budgetIds: ReadonlyMap<string, string>;
    calendar: InsightsCalendar;
    categories: ReadonlyMap<string, CategoryMeta>;
    closed: boolean;
    code: string;
    db: Database;
    nowMs: number;
    offset: number;
    period: InsightsPeriod;
    subscriptions: SubscriptionDetail | null;
    window: BudgetWindow;
}

interface CardProps<Card> {
    card: Card;
    context: CardsContext;
    money: Money;
    name: string;
}

function OverLimitCard({ card, context, money, name }: CardProps<Extract<AnswerCardData, { kind: "overLimit" }>>) {
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();
    const { displayCurrency, rates } = useValuation(context.db);
    const rows = useBudgetContributions(
        context.db,
        card.categoryId,
        context.window.start,
        windowEndMs(context.window, context.nowMs)
    );
    const valued = valueDatedRowsIn(rows, displayCurrency, rates);
    const biggest = valued.reduce((best, amount, index) => (amount > (valued[best] ?? -1) ? index : best), 0);
    const row = rows[biggest];
    const budgetId = context.budgetIds.get(card.categoryId);

    const now = new Date(context.nowMs);
    const labels = card.bars.map((_, index) => {
        const offset = context.offset - (card.bars.length - 1 - index);
        return context.period === "month"
            ? monthAbbrevTitle(windowStart("month", now, offset, context.calendar), language)
            : windowShortLabel(context.period, offset, now, context.calendar, language);
    });

    let evidence: string | undefined;
    if (row) {
        const named = row.note.trim();
        evidence = t(named ? "insights.answers.limit.evidence" : "insights.answers.limit.evidenceUnnamed", {
            amount: money.exact(valued[biggest]),
            date: formatSentenceDate(row.date, language),
            name: named,
            spent: money.exact(card.spent),
        });
    }

    return (
        <AnswerCard
            evidence={evidence}
            kicker={t("insights.answers.limit.kicker", { name })}
            kickerClass="text-danger"
            onSee={budgetId ? () => router.push(`/balances/${budgetId}`) : undefined}
            seeLabel={t("insights.answers.see", { name })}
            title={t("insights.answers.limit.title", { limit: money.exact(card.limit), name })}
        >
            <LimitBars bars={card.bars} labels={labels} limit={card.limit} />
        </AnswerCard>
    );
}

function VsUsualCard({ card, context, money, name }: CardProps<Extract<AnswerCardData, { kind: "vsUsual" }>>) {
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();
    const under = card.spent < card.usual;
    const usualDate = context.closed ? addDays(context.window.end, -1) : new Date(context.nowMs);

    return (
        <AnswerCard
            kicker={t(under ? "insights.answers.vs.below" : "insights.answers.vs.above", { name })}
            kickerClass={under ? "text-income" : "text-danger"}
            onSee={() =>
                router.push({
                    params: { category: card.categoryId, offset: String(context.offset) },
                    pathname: "/insights/breakdown",
                })
            }
            seeLabel={t("insights.answers.see", { name })}
            title={t(under ? "insights.answers.vs.under" : "insights.answers.vs.over", {
                gap: money.rounded(Math.abs(card.spent - card.usual)),
                name,
            })}
        >
            <UsualBars
                amount={money.rounded(card.spent)}
                under={under}
                usual={card.usual}
                usualAmount={money.rounded(card.usual)}
                usualLabel={t("insights.answers.usualBy", { date: formatSentenceDate(usualDate, language) })}
                value={card.spent}
                valueLabel={context.barName}
            />
        </AnswerCard>
    );
}

function SubscriptionsCard({ detail, money }: { detail: SubscriptionDetail; money: Money }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();
    const unnamed = t("insights.answers.subs.unnamed");
    const rows = detail.items.slice(0, SUBSCRIPTION_ROWS).map((item) => ({
        amount: money.exact(item.perMonth),
        id: item.id,
        name: item.name || unnamed,
    }));

    return (
        <AnswerCard
            evidence={t("insights.answers.subs.evidence", {
                date: formatSentenceDate(detail.next.next, language),
                name: detail.next.name || unnamed,
                yearly: money.rounded(detail.perMonth * 12),
            })}
            kicker={t("insights.answers.subs.kicker")}
            onSee={() => router.push("/settings/upcoming")}
            seeLabel={t("insights.answers.seeSubscriptions")}
            title={t("insights.answers.subs.title", {
                amount: money.exact(detail.perMonth),
                count: detail.items.length,
            })}
        >
            <ProofRows rows={rows} />
        </AnswerCard>
    );
}

export function AnswerCards({ cards, context }: { cards: readonly AnswerCardData[]; context: CardsContext }) {
    const money = useMoney(context.code);
    return cards.map((card) => {
        if (card.kind === "subscriptions") {
            return context.subscriptions ? (
                <SubscriptionsCard detail={context.subscriptions} key="subscriptions" money={money} />
            ) : null;
        }
        const name = context.categories.get(card.categoryId)?.name;
        if (!name) {
            return null;
        }
        const key = `${card.kind}:${card.categoryId}`;
        return card.kind === "overLimit" ? (
            <OverLimitCard card={card} context={context} key={key} money={money} name={name} />
        ) : (
            <VsUsualCard card={card} context={context} key={key} money={money} name={name} />
        );
    });
}
