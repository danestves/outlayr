import type { RateTable } from "@outlayr/money/valuation";

import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { Account } from "@/data/accounts-core";
import { cardStatement } from "@/data/card-statement";
import type { CardStatement } from "@/data/card-statement";
import { useInstallmentPlans } from "@/data/installments";
import type { Database } from "@/db/client";
import { formatSentenceDate } from "@/domain/dates";
import type { PlottedCell } from "@/domain/goal-balance-series";
import { startOfLocalDay } from "@/domain/local-day";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";

interface CardLinesProps {
    account: Account;
    balance: number;
    cells: readonly PlottedCell[];
    db: Database;
    nowMs: number;
    rates: RateTable;
}

export function hasCardLines(account: Pick<Account, "creditLimit" | "paymentDay" | "statementDay">): boolean {
    return account.creditLimit !== null || (account.paymentDay !== null && account.statementDay !== null);
}

export function CardLines({ account, balance, cells, db, nowMs, rates }: CardLinesProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const plans = useInstallmentPlans(db, nowMs, account.id);
    const statement = cardStatement(account, cells, rates, plans, nowMs);
    const money = (amount: number) => formatAmount(amount, account.currency, showCents, language);
    const date = (day: Date) => formatSentenceDate(day, language);
    const overdue = statement !== null && statement.due > 0 && statement.cycle.dueOn.getTime() < startOfLocalDay(nowMs);
    return (
        <>
            {statement === null ? null : (
                <Text className={`font-sans-medium text-subtitle ${overdue ? "text-danger" : "text-muted"}`}>
                    {statementWording(t, statement, overdue, nowMs, money, date)}
                </Text>
            )}
            {account.creditLimit === null ? null : (
                <Text className="font-sans-medium text-muted text-subtitle">
                    {t("accounts.card.available", {
                        amount: money(account.creditLimit + balance),
                        limit: money(account.creditLimit),
                    })}
                </Text>
            )}
        </>
    );
}

function statementWording(
    t: TranslateFn,
    { cycle, due }: CardStatement,
    overdue: boolean,
    nowMs: number,
    money: (amount: number) => string,
    date: (day: Date) => string
): string {
    if (overdue) {
        return t("accounts.card.overdue", { amount: money(due), date: date(cycle.dueOn) });
    }
    const upcoming = cycle.dueOn.getTime() >= startOfLocalDay(nowMs);
    if (due > 0) {
        const closed = t("accounts.card.closed", { date: date(cycle.closedOn) });
        return `${t("accounts.card.due", { amount: money(due), date: date(cycle.dueOn) })} · ${closed}`;
    }
    return upcoming
        ? t("accounts.card.nothingDue", { date: date(cycle.dueOn) })
        : t("accounts.card.nextClose", { date: date(cycle.nextCloseOn) });
}
