import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { monthlyChargeCount } from "@outlayr/money/subscription-cost";

const NOT_NUMBER = /[^\d.,]/gu;
const SEPARATORS = /[.,]/gu;
const GROUPS = /\B(?=(\d{3})+(?!\d))/gu;
const MAX_DIGITS = 13;

export function parseAmount(text: string, code: string): number {
    const decimals = decimalsFor(code);
    const cleaned = text.replaceAll(NOT_NUMBER, "");
    const at = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
    const decimal = at !== -1 && cleaned.length - at - 1 <= decimals;
    const whole = (decimal ? cleaned.slice(0, at) : cleaned).replaceAll(SEPARATORS, "").slice(0, MAX_DIGITS);
    const fraction = decimal ? cleaned.slice(at + 1) : "";
    return Number(`${whole}${fraction.padEnd(decimals, "0")}`);
}

export function formatAmount(minor: number, code: string): string {
    const decimals = decimalsFor(code);
    const { symbol } = currencyDisplayFor(code);
    const [whole = "0", fraction] = (Math.abs(minor) / 10 ** decimals).toFixed(decimals).split(".");
    const number = fraction ? `${whole.replaceAll(GROUPS, ",")}.${fraction}` : whole.replaceAll(GROUPS, ",");
    return `${minor < 0 ? "-" : ""}${symbol === code ? `${code} ` : symbol}${number}`;
}

export const CADENCES = {
    month: { every: 1, type: RECURRING_TYPE.monthly },
    quarter: { every: 3, type: RECURRING_TYPE.monthly },
    twoWeeks: { every: 2, type: RECURRING_TYPE.weekly },
    week: { every: 1, type: RECURRING_TYPE.weekly },
    year: { every: 1, type: RECURRING_TYPE.yearly },
} as const;

export type Cadence = keyof typeof CADENCES;

export function perYear(cadence: Cadence): number {
    const { every, type } = CADENCES[cadence];
    return Math.round(monthlyChargeCount(type, every) * 12);
}

export function subscriptionCost(items: readonly { amount: number; cadence: Cadence }[]) {
    const yearly = items.map(({ amount, cadence }) => amount * perYear(cadence));
    const total = yearly.reduce((sum, amount) => sum + amount, 0);
    return { monthly: Math.round(total / 12), total, yearly };
}

const RATE_STEPS = 200;

function presentValue(payment: number, count: number, rate: number): number {
    return rate === 0 ? payment * count : (payment * (1 - (1 + rate) ** -count)) / rate;
}

function periodRate(financed: number, payment: number, count: number): number | null {
    if (financed <= 0 || payment <= 0 || count < 1) {
        return null;
    }
    if (payment * count === financed) {
        return 0;
    }
    let low = -0.99;
    let high = 1;
    while (presentValue(payment, count, high) > financed) {
        high *= 2;
    }
    for (let step = 0; step < RATE_STEPS; step += 1) {
        const mid = (low + high) / 2;
        if (presentValue(payment, count, mid) > financed) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return (low + high) / 2;
}

export interface InstallmentPlan {
    cadence: Cadence;
    count: number;
    down: number;
    payment: number;
    price: number;
}

export function installmentCost({ cadence, count, down, payment, price }: InstallmentPlan) {
    const total = down + payment * count;
    const rate = periodRate(price - down, payment, count);
    return {
        annualRate: rate === null ? null : (1 + rate) ** perYear(cadence) - 1,
        extra: total - price,
        total,
    };
}

export const BUDGET_SPLITS = {
    "50-30-20": [50, 30, 20],
    "60-20-20": [60, 20, 20],
    "70-20-10": [70, 20, 10],
} as const satisfies Record<string, readonly [needs: number, wants: number, savings: number]>;

export type BudgetSplit = keyof typeof BUDGET_SPLITS;

export function splitBudget(income: number, split: BudgetSplit): number[] {
    const exact = BUDGET_SPLITS[split].map((percent) => (income * percent) / 100);
    const parts = exact.map(Math.floor);
    const short = income - parts.reduce((sum, part) => sum + part, 0);
    const bumped = new Set(
        exact
            .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
            .toSorted((a, b) => b.remainder - a.remainder)
            .slice(0, short)
            .map(({ index }) => index)
    );
    return parts.map((part, index) => part + (bumped.has(index) ? 1 : 0));
}

export interface Transfer {
    amount: number;
    from: number;
    to: number;
}

export function settleUp(paid: readonly number[]) {
    const total = paid.reduce((sum, amount) => sum + amount, 0);
    const base = Math.floor(total / Math.max(1, paid.length));
    const leftover = total - base * paid.length;
    const shareOf = (index: number) => base + (index < leftover ? 1 : 0);
    const byBalance = (sign: 1 | -1) =>
        paid
            .map((amount, index) => ({ amount: (amount - shareOf(index)) * sign, index }))
            .filter(({ amount }) => amount > 0)
            .toSorted((a, b) => b.amount - a.amount);
    const owed = byBalance(1);
    const owing = byBalance(-1);
    const transfers: Transfer[] = [];
    let creditor = owed.shift();
    let debtor = owing.shift();
    while (creditor && debtor) {
        const amount = Math.min(creditor.amount, debtor.amount);
        transfers.push({ amount, from: debtor.index, to: creditor.index });
        creditor.amount -= amount;
        debtor.amount -= amount;
        if (creditor.amount === 0) {
            creditor = owed.shift();
        }
        if (debtor.amount === 0) {
            debtor = owing.shift();
        }
    }
    return { share: paid.map((_, index) => shareOf(index)), total, transfers };
}
