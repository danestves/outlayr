import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";

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

export const PER_YEAR = { month: 12, quarter: 4, twoWeeks: 26, week: 52, year: 1 } as const;

export type Cadence = keyof typeof PER_YEAR;

export function subscriptionCost(items: readonly { amount: number; cadence: Cadence }[]) {
    const yearly = items.map(({ amount, cadence }) => amount * PER_YEAR[cadence]);
    const total = yearly.reduce((sum, amount) => sum + amount, 0);
    return { monthly: Math.round(total / 12), total, yearly };
}

const RATE_STEPS = 200;

function presentValue(payment: number, count: number, rate: number): number {
    return rate === 0 ? payment * count : (payment * -Math.expm1(-count * Math.log1p(rate))) / rate;
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

function answerFor(
    { down, payment, price }: InstallmentPlan,
    extra: number
): "covered" | "empty" | "less" | "more" | "paid" | "same" {
    if (price <= 0 || (down < price && payment <= 0)) {
        return "empty";
    }
    if (down >= price) {
        return extra > 0 ? "covered" : "paid";
    }
    if (extra === 0) {
        return "same";
    }
    return extra > 0 ? "more" : "less";
}

export function installmentCost(plan: InstallmentPlan) {
    const { cadence, count, down, payment, price } = plan;
    const total = down + payment * count;
    const rate = periodRate(price - down, payment, count);
    return {
        annualRate: rate === null ? null : (1 + rate) ** PER_YEAR[cadence] - 1,
        answer: answerFor(plan, total - price),
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
            .sort((a, b) => b.remainder - a.remainder)
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
            .sort((a, b) => b.amount - a.amount);
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
