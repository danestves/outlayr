import { decimalsFor } from "@outlayr/money/currency";
import { planStanding } from "@outlayr/money/installments";
import { accountLook } from "@outlayr/money/ledger-log";
import { isoDay } from "@outlayr/money/ledger-zone";
import { roundMoney } from "@outlayr/money/round";

import { inMain } from "@/components/dashboard/accounts/model";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { addDays, daysBetween } from "@/lib/ledger";

type Books = Ledger["books"];

export const SOON_DAYS = 30;
const WEEK = 7;
const MONTHS_IN_YEAR = 12;
const SEMIMONTHLY_GAP = { max: 17, min: 13 };

export type Cadence = { every: number; kind: "days" } | { kind: "monthly" } | { kind: "semimonthly" };

export type RowStatus = "paid" | "partial" | "unpaid";

export interface InstallmentView {
    amount: number;
    covered: number;
    day: string;
    fee: number;
    feeIds: readonly string[];
    id: string;
    leftAfter: number;
    overdue: boolean;
    owed: number;
    paidFrom: string | null;
    remaining: number;
    sequence: number;
    status: RowStatus;
}

export interface PlanView {
    account: { currency: string; id: string; look: ReturnType<typeof accountLook>; name: string };
    cadence: Cadence | null;
    categoryId: string | null;
    count: number;
    currency: string;
    each: number | null;
    finished: boolean;
    id: string;
    left: number;
    look: { emoji: string | null; icon: string | null } | null;
    name: string;
    next: InstallmentView | null;
    overdue: { amount: number; since: string } | null;
    paid: number;
    paidCount: number;
    paidOff: string | null;
    price: number;
    purchaseDay: string | null;
    rows: readonly InstallmentView[];
    scheduled: number;
    upfront: InstallmentView | null;
}

interface Payment {
    amount: number;
    at: number;
    from: string | null;
}

const toMinor = (amount: number, currency: string) => Math.round(amount * 10 ** decimalsFor(currency));

function monthIndex(day: string) {
    return Number(day.slice(0, 4)) * MONTHS_IN_YEAR + Number(day.slice(5, 7)) - 1;
}

function lastDayOf(day: string) {
    return new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate();
}

const dayOfMonth = (day: string) => Number(day.slice(8, 10));

export function cadenceOf(days: readonly string[]): Cadence | null {
    if (days.length < 2) {
        return null;
    }
    const anchor = Math.max(...days.map(dayOfMonth));
    const monthly = days.every(
        (day, index) =>
            dayOfMonth(day) === Math.min(anchor, lastDayOf(day)) &&
            (index === 0 || monthIndex(day) - monthIndex(days[index - 1] ?? day) === 1)
    );
    if (monthly) {
        return { kind: "monthly" };
    }
    const gaps = days.slice(1).map((day, index) => daysBetween(days[index] ?? day, day));
    const [gap = 0] = gaps;
    if (gap > 0 && gaps.every((each) => each === gap)) {
        return { every: gap, kind: "days" };
    }
    const perMonth = new Map<number, number>();
    for (const day of days) {
        perMonth.set(monthIndex(day), (perMonth.get(monthIndex(day)) ?? 0) + 1);
    }
    const twice =
        gaps.every((each) => each >= SEMIMONTHLY_GAP.min && each <= SEMIMONTHLY_GAP.max) &&
        [...perMonth.values()].every((count) => count <= 2);
    return twice ? { kind: "semimonthly" } : null;
}

export const isWeekly = (cadence: Cadence | null) => cadence?.kind === "days" && cadence.every === WEEK;

function paymentsOf(books: Books, planId: string, accountId: string): Payment[] {
    const moved = books.transfers
        .filter((row) => row.deletedAt === null && row.installmentPlanId === planId && row.toAccountId === accountId)
        .map((row) => ({ amount: row.toAmount, at: row.date, from: row.fromAccountId }));
    const outside = books.outsidePayments
        .filter((row) => row.deletedAt === null && row.planId === planId)
        .map((row) => ({ amount: row.amount, at: row.date, from: null }));
    return [...moved, ...outside].toSorted((a, b) => a.at - b.at);
}

function payers(owed: readonly number[], payments: readonly Payment[], currency: string) {
    const paidBy: (Payment | null)[] = [];
    let index = 0;
    let poured = 0;
    let needed = 0;
    for (const amount of owed) {
        needed += toMinor(amount, currency);
        while (poured < needed && index < payments.length) {
            poured += toMinor(payments[index]?.amount ?? 0, currency);
            index += 1;
        }
        paidBy.push(poured >= needed && index > 0 ? (payments[index - 1] ?? null) : null);
    }
    return paidBy;
}

const viewsMemo = new WeakMap<Ledger, PlanView[]>();

export function planViews(ledger: Ledger): PlanView[] {
    const kept = viewsMemo.get(ledger);
    if (kept) {
        return kept;
    }
    const { books } = ledger;
    const dayOf = (at: number) => isoDay(at, ledger.offsetAt(at));
    const views = books.installmentPlans.flatMap((plan): PlanView[] => {
        const account = books.accounts.find((row) => row.localId === plan.accountId && row.deletedAt === null);
        if (plan.deletedAt !== null || !account) {
            return [];
        }
        const { currency } = account;
        const rows = books.installments
            .filter((row) => row.deletedAt === null && row.planId === plan.localId)
            .map((row) => {
                const fees = books.transactions.filter(
                    (each) =>
                        each.deletedAt === null &&
                        each.installmentId === row.localId &&
                        !each.income &&
                        each.accountId === plan.accountId &&
                        each.currency === currency
                );
                return {
                    amount: row.amount,
                    dueDate: new Date(row.dueDate),
                    fee: roundMoney(
                        fees.reduce((sum, each) => sum + each.amount, 0),
                        decimalsFor(currency)
                    ),
                    feeIds: fees.map((each) => each.localId),
                    id: row.localId,
                    sequence: row.sequence,
                };
            });
        const payments = paymentsOf(books, plan.localId, plan.accountId);
        const paid = payments.reduce((sum, row) => sum + row.amount, 0);
        const standing = planStanding(rows, paid, new Date(ledger.now), currency);
        const paidBy = payers(
            standing.rows.map((each) => each.owed),
            payments,
            currency
        );
        let left = standing.scheduled;
        const shown = standing.rows.map((each, index): InstallmentView => {
            const day = dayOf(each.row.dueDate.getTime());
            left = roundMoney(left - each.owed, decimalsFor(currency));
            return {
                amount: each.row.amount,
                covered: each.covered,
                day,
                fee: each.row.fee,
                feeIds: each.row.feeIds,
                id: each.row.id,
                leftAfter: Math.max(0, left),
                overdue: each.status !== "paid" && day < ledger.today,
                owed: each.owed,
                paidFrom: each.status === "paid" ? (paidBy[index]?.from ?? null) : null,
                remaining: each.remaining,
                sequence: each.row.sequence,
                status: each.status,
            };
        });
        const installments = shown.filter((row) => row.sequence > 0).toSorted((a, b) => a.sequence - b.sequence);
        const late = shown.filter((row) => row.overdue);
        const [firstLate] = late;
        const purchase = books.transactions.find((row) => row.localId === plan.transactionId && row.deletedAt === null);
        const category = books.categories.find((row) => row.localId === purchase?.categoryId);
        const amounts = new Set(installments.map((row) => row.amount));
        const finisher = standing.finished ? paidBy.at(-1) : null;
        return [
            {
                account: { currency, id: account.localId, look: accountLook(account), name: account.name },
                cadence: cadenceOf(installments.map((row) => row.day)),
                categoryId: purchase?.categoryId ?? null,
                count: standing.installmentsTotal,
                currency,
                each: amounts.size === 1 ? (installments[0]?.amount ?? null) : null,
                finished: standing.finished && shown.length > 0,
                id: plan.localId,
                left: standing.remaining,
                look: category ? { emoji: category.emoji ?? null, icon: category.icon ?? null } : null,
                name: purchase?.note.trim() ?? "",
                next: shown.find((row) => row.status !== "paid") ?? null,
                overdue: firstLate
                    ? {
                          amount: roundMoney(
                              late.reduce((sum, row) => sum + row.remaining, 0),
                              decimalsFor(currency)
                          ),
                          since: firstLate.day,
                      }
                    : null,
                paid: standing.paid,
                paidCount: standing.installmentsPaid,
                paidOff: finisher ? dayOf(finisher.at) : null,
                price: purchase?.amount ?? standing.scheduled,
                purchaseDay: purchase ? dayOf(purchase.date) : null,
                rows: shown,
                scheduled: standing.scheduled,
                upfront: shown.find((row) => row.sequence === 0) ?? null,
            },
        ];
    });
    viewsMemo.set(ledger, views);
    return views;
}

export interface ComingRow {
    plan: PlanView;
    row: InstallmentView;
}

export interface InstallmentsSummary {
    active: readonly PlanView[];
    left: number;
    overdue: { amount: number; plans: readonly PlanView[]; since: string } | null;
    paid: number;
    paidOff: readonly PlanView[];
    scheduled: number;
    soon: { amount: number; rows: readonly ComingRow[] };
}

const byNext = (a: PlanView, b: PlanView) => (a.next?.day ?? "").localeCompare(b.next?.day ?? "");

export function installmentsSummary(ledger: Ledger, views: readonly PlanView[]): InstallmentsSummary {
    const main = (amount: number, currency: string) => inMain(ledger, amount, currency).value;
    const sum = (values: readonly number[]) =>
        roundMoney(
            values.reduce((total, value) => total + value, 0),
            decimalsFor(ledger.currency)
        );
    const active = views.filter((view) => !view.finished).toSorted(byNext);
    const paidOff = views
        .filter((view) => view.finished)
        .toSorted((a, b) => (b.paidOff ?? "").localeCompare(a.paidOff ?? ""));
    const through = addDays(ledger.today, SOON_DAYS);
    const soon = active
        .flatMap((plan) =>
            plan.rows.filter((row) => row.status !== "paid" && row.day <= through).map((row) => ({ plan, row }))
        )
        .toSorted((a, b) => a.row.day.localeCompare(b.row.day) || a.plan.name.localeCompare(b.plan.name));
    const late = active.filter((view) => view.overdue !== null);
    const [since] = late.map((view) => view.overdue?.since ?? "").toSorted();
    return {
        active,
        left: sum(active.map((view) => main(view.left, view.currency))),
        overdue:
            since === undefined
                ? null
                : {
                      amount: sum(late.map((view) => main(view.overdue?.amount ?? 0, view.currency))),
                      plans: late.toSorted((a, b) => (a.overdue?.since ?? "").localeCompare(b.overdue?.since ?? "")),
                      since,
                  },
        paid: sum(active.map((view) => main(view.paid, view.currency))),
        paidOff,
        scheduled: sum(active.map((view) => main(view.scheduled, view.currency))),
        soon: { amount: sum(soon.map(({ plan, row }) => main(row.remaining, plan.currency))), rows: soon },
    };
}

export const leftAfterPaying = (view: Pick<PlanView, "currency" | "left">, amount: number) =>
    Math.max(0, roundMoney(view.left - amount, decimalsFor(view.currency)));

export const openRows = (view: PlanView) => view.rows.filter((row) => row.status !== "paid");

export const planById = (views: readonly PlanView[], planId: string) =>
    views.find((view) => view.id.toLowerCase() === planId.toLowerCase()) ?? null;
