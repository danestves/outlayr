import { isPerson } from "@outlayr/money/account-kind";

import type { DebtsScreenOverview } from "@/data/debts";
import { DUE_WINDOW_DAYS } from "@/data/debts-due";
import type { PayoffLine } from "@/data/payoff-plans";
import { formatDayMonth, formatSentenceDate } from "@/domain/dates";
import { daysBetween, startOfLocalDay } from "@/domain/local-day";
import { formatAmount, maskedAmount } from "@/domain/money";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

type DebtListRow = DebtsScreenOverview["youOwe"][number];

interface Wording {
    currency: string;
    language: Language;
    showCents: boolean;
    t: TranslateFn;
}

export interface DebtSubtitle {
    text: string | null;
    tone: "due" | "income" | "muted" | "overdue";
}

export function debtSubtitle(
    item: DebtListRow,
    debts: DebtsScreenOverview,
    { currency, language, showCents, t }: Wording
): DebtSubtitle {
    const otherCurrency = item.account.currency === currency ? null : item.account.currency;
    if (item.kind === "person" && item.amount !== 0) {
        const owesYou = item.balance > 0;
        const direction = t(owesYou ? "debts.person.owesYou" : "debts.person.youOwe");
        return {
            text: otherCurrency === null ? direction : `${direction} · ${otherCurrency}`,
            tone: owesYou ? "income" : "muted",
        };
    }
    const tone = item.id === debts.due?.next.accountId ? "due" : "muted";
    const orders = debts.installments.get(item.id);
    if (orders === undefined) {
        return { text: otherCurrency, tone };
    }
    const [only, ...others] = orders.open;
    const { overdue } = orders.next;
    const date = formatSentenceDate(orders.next.row.dueDate, language);
    const next = {
        amount: formatAmount(orders.next.remaining, item.account.currency, showCents, language),
        date: overdue ? `${date} · ${t("installments.overdue")}` : date,
    };
    const text =
        only && others.length === 0
            ? t(overdue ? "debts.overdue.of" : "debts.next.of", {
                  ...next,
                  paid: only.standing.installmentsPaid,
                  total: only.standing.installmentsTotal,
              })
            : t(overdue ? "debts.overdue.orders" : "debts.next.orders", { ...next, count: orders.open.length });
    return { text, tone: overdue ? "overdue" : tone };
}

export function dueStripWording(
    due: NonNullable<DebtsScreenOverview["due"]>,
    debts: DebtsScreenOverview,
    { language, t }: Pick<Wording, "language" | "t">
) {
    const { overdue } = due.next.standing;
    const name = debts.youOwe.find((item) => item.id === due.next.accountId)?.account.name;
    return {
        overdue,
        summary: t(overdue ? "debts.due.overdue" : "debts.due.summary", {
            count: due.count,
            date: formatSentenceDate(due.next.standing.row.dueDate, language),
            name: name ?? t("installments.order"),
        }),
        title: t("debts.due.title", { days: DUE_WINDOW_DAYS }),
    };
}

function planMoney(amount: number, currency: string, hidden: boolean, language: Language): string {
    return hidden ? maskedAmount(currency) : formatAmount(amount, currency, false, language);
}

export interface PayoffFacts {
    /** Null when on pace or ahead. */
    behind: string | null;
    /** What a month costs until the date, or under a month what is left by it; null once unvalued. */
    plan: string | null;
}

export function payoffFacts(
    line: PayoffLine,
    currency: string,
    hidden: boolean,
    nowMs: number,
    { language, t }: Pick<Wording, "language" | "t">
): PayoffFacts {
    const money = (amount: number) => planMoney(amount, currency, hidden, language);
    const behind = line.behind === null ? null : t("debts.plan.behind", { amount: money(line.behind) });
    if (line.pace === null) {
        return { behind, plan: null };
    }
    const date = formatSentenceDate(line.targetDate, language);
    const amount = money(line.pace.perMonth);
    if (line.pace.monthsLeft > 0) {
        return { behind, plan: t("debts.plan.perMonth", { amount, date }) };
    }
    const days = daysBetween(startOfLocalDay(nowMs), startOfLocalDay(line.targetDate.getTime()));
    return {
        behind,
        plan: days > 0 ? t("debts.plan.byDays", { amount, count: days, date }) : t("debts.plan.by", { amount, date }),
    };
}

export function payoffRowWording(
    item: DebtListRow,
    line: PayoffLine | undefined,
    currency: string,
    hidden: boolean,
    { language, t }: Pick<Wording, "language" | "t">
): { a11y: string; date: string } | { paidOff: string } | null {
    if (line === undefined) {
        return null;
    }
    if (line.endedOn !== null) {
        if (item.amount !== 0) {
            return null;
        }
        const date = formatDayMonth(line.endedOn, language);
        return { paidOff: t(isPerson(item.account) ? "debts.plan.paidBack" : "debts.plan.paidOff", { date }) };
    }
    const date = formatSentenceDate(line.targetDate, language);
    const a11y =
        line.behind === null
            ? t("debts.plan.row", { date })
            : t("debts.plan.rowBehind", { amount: planMoney(line.behind, currency, hidden, language), date });
    return { a11y, date };
}
