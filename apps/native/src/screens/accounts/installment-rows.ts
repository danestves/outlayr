import type { InstallmentStanding } from "@outlayr/money/installments";
import { isInstallmentAppAccount } from "@outlayr/money/institution-map";

import type { Account } from "@/data/accounts-core";
import type { DebtsScreenOverview } from "@/data/debts";
import type { InstallmentRow, PlanWithStanding } from "@/data/installments-core";
import { formatSentenceDate } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { orderName } from "@/domain/order-name";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { dueIn } from "@/screens/installments/labels";

export interface OpenInstallment {
    account: Account;
    id: string;
    next: InstallmentStanding<InstallmentRow>;
    plan: PlanWithStanding;
}

/** An installment app's own balance is its open plans, so it leaves Debts only while those plans are listed apart. */
export function withoutInstallmentApps<Row extends { account: Account; amount: number }>(
    rows: readonly Row[],
    installments: DebtsScreenOverview["installments"]
): Row[] {
    return rows.filter(
        (row) =>
            !isInstallmentAppAccount(row.account) ||
            (installments.get(row.account.id) === undefined && Math.abs(row.amount) > 0)
    );
}

export function openInstallments(plans: readonly PlanWithStanding[], accounts: readonly Account[]): OpenInstallment[] {
    const byId = new Map(accounts.map((account) => [account.id, account]));
    const open: OpenInstallment[] = [];
    for (const plan of plans) {
        const account = byId.get(plan.plan.accountId);
        const { next } = plan.standing;
        if (account !== undefined && next !== null) {
            open.push({ account, id: plan.plan.id, next, plan });
        }
    }
    return open.sort((a, b) => a.next.row.dueDate.getTime() - b.next.row.dueDate.getTime());
}

/** Reuses the plans and accounts the Debts overview already read for this screen. */
export function installmentRows(debts: Pick<DebtsScreenOverview, "installments" | "youOwe">): OpenInstallment[] {
    const plans = [...debts.installments.values()].flatMap(({ open }) => open);
    return openInstallments(
        plans,
        debts.youOwe.map((item) => item.account)
    );
}

export interface InstallmentWording {
    language: Language;
    nowMs: number;
    showCents: boolean;
    t: TranslateFn;
}

export function installmentRow(
    { account, next, plan }: OpenInstallment,
    { language, nowMs, showCents, t }: InstallmentWording
) {
    const date = formatSentenceDate(next.row.dueDate, language);
    const due = dueIn(t, next.row.dueDate, nowMs);
    return {
        amount: formatAmount(next.remaining, account.currency, showCents, language),
        overdue: next.overdue,
        progress: t("accounts.installments.progress", {
            paid: plan.standing.installmentsPaid,
            provider: account.name,
            total: plan.standing.installmentsTotal,
        }),
        title: orderName(t, plan.purchase),
        when: next.overdue ? `${date} · ${t("installments.overdue")}` : [date, due].filter(Boolean).join(" · "),
    };
}
