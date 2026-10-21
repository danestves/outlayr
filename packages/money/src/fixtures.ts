import type { EntryRateType, MarketRateType, RateLookup } from "./rates";

const DATE_STRING_LENGTH = 10;
const DAY_MS = 86_400_000;

export const REFERENCE_DATE_MS = Date.UTC(2026, 5, 30);

export function dateWithinWindow(daysBeforeReference: number): string {
    return new Date(REFERENCE_DATE_MS - daysBeforeReference * DAY_MS).toISOString().slice(0, DATE_STRING_LENGTH);
}

export interface RateTableRow {
    date: string;
    quote: string;
    rate: number;
    rateType: MarketRateType;
}

// Mirrors the backend `resolveRateOnDate`: the newest row on or before the date wins, else null.
export function makeRateLookup(rows: readonly RateTableRow[]): RateLookup {
    return (quote, rateType, date) => {
        const [match] = rows
            .filter((r) => r.quote === quote && r.rateType === rateType && r.date <= date)
            .sort((a, b) => b.date.localeCompare(a.date));
        return Promise.resolve(match ? { date: match.date, rate: match.rate } : null);
    };
}

export interface ComputeUsdVector {
    expectedUSD: number;
    input: {
        baseAmount: number;
        exchangeRateType: EntryRateType;
        exchangeRate: number;
        date: string;
    };
    name: string;
}

const ENTRY_DATE = dateWithinWindow(0);

export const COMPUTE_USD_VECTORS: ComputeUsdVector[] = [
    {
        expectedUSD: 80,
        input: {
            baseAmount: 4000,
            date: ENTRY_DATE,
            exchangeRate: 50,
            exchangeRateType: "official",
        },
        name: "single-leg official, exact quotient",
    },
    {
        expectedUSD: 33.333333,
        input: {
            baseAmount: 100,
            date: ENTRY_DATE,
            exchangeRate: 3,
            exchangeRateType: "official",
        },
        name: "single-leg official, repeating quotient rounds half-even at scale 6",
    },
    {
        expectedUSD: 2.5,
        input: {
            baseAmount: 100,
            date: ENTRY_DATE,
            exchangeRate: 40,
            exchangeRateType: "custom",
        },
        name: "single-leg custom rate",
    },
    {
        expectedUSD: 100,
        input: {
            baseAmount: 74_733,
            date: ENTRY_DATE,
            exchangeRate: 747.33,
            exchangeRateType: "eur_reference",
        },
        name: "single-leg eur_reference, the BCV euro figure applied per dollar",
    },
    {
        expectedUSD: -33.333333,
        input: {
            baseAmount: -100,
            date: ENTRY_DATE,
            exchangeRate: 3,
            exchangeRateType: "official",
        },
        name: "negative base amount keeps its sign through half-even division",
    },
    {
        expectedUSD: 9_000_000_000,
        input: {
            baseAmount: 9_000_000_000,
            date: ENTRY_DATE,
            exchangeRate: 1,
            exchangeRateType: "official",
        },
        name: "large amount stays exact just under the 2^53 micro-dollar ceiling",
    },
];

export interface ComputeUsdThrowVector {
    input: {
        baseAmount: number;
        exchangeRateType: EntryRateType;
        exchangeRate: number;
        date: string;
    };
    messagePattern: RegExp;
    name: string;
}

export const COMPUTE_USD_THROW_VECTORS: ComputeUsdThrowVector[] = [
    {
        input: {
            baseAmount: 1,
            date: ENTRY_DATE,
            exchangeRate: Number.MIN_VALUE,
            exchangeRateType: "custom",
        },
        messagePattern: /not finite/,
        name: "overflow guard: a sub-normal custom rate derives a non-finite amount",
    },
];

export interface RoundMoneyVector {
    decimals?: number;
    expected: number;
    name: string;
    value: number;
}

export const ROUND_MONEY_VECTORS: RoundMoneyVector[] = [
    { expected: 0.12, name: "0.125 -> 0.12 (round down to even)", value: 0.125 },
    { expected: 0.38, name: "0.375 -> 0.38 (round up to even)", value: 0.375 },
    { expected: 0.62, name: "0.625 -> 0.62 (round down to even)", value: 0.625 },
    { expected: 0.88, name: "0.875 -> 0.88 (round up to even)", value: 0.875 },
    {
        expected: -0.12,
        name: "-0.125 -> -0.12 (symmetric half-even)",
        value: -0.125,
    },
    {
        decimals: 0,
        expected: 2,
        name: "2.5 -> 2 at 0 decimals (even)",
        value: 2.5,
    },
    {
        decimals: 0,
        expected: 4,
        name: "3.5 -> 4 at 0 decimals (even)",
        value: 3.5,
    },
    {
        decimals: 0,
        expected: 0,
        name: "0.5 -> 0 at 0 decimals (even)",
        value: 0.5,
    },
    {
        expected: 2.5,
        name: "2.5 -> 2.5 when target scale exceeds input",
        value: 2.5,
    },
    { expected: 100, name: "100 -> 100 identity", value: 100 },
    { expected: 2.68, name: "2.675 -> 2.68 (binary trap)", value: 2.675 },
    { expected: 1, name: "1.005 -> 1.00 (binary trap, even)", value: 1.005 },
    { expected: 1.02, name: "1.015 -> 1.02 (binary trap, odd)", value: 1.015 },
    { expected: 0.62, name: "0.615 -> 0.62 (binary trap, odd)", value: 0.615 },
    {
        expected: 1.14,
        name: "1.135 -> 1.14 (half-even up, odd neighbour)",
        value: 1.135,
    },
    {
        expected: 1.16,
        name: "1.155 -> 1.16 (half-even up, odd neighbour)",
        value: 1.155,
    },
    {
        expected: 0.1,
        name: "0.105 -> 0.10 (half-even down, even neighbour)",
        value: 0.105,
    },
    {
        expected: 1.13,
        name: "1.1349999999999998 -> 1.13 (below half; old epsilon gave 1.14)",
        value: 1.1349999999999998,
    },
    {
        expected: 0.11,
        name: "0.10500000000000001 -> 0.11 (above half; old epsilon gave 0.10)",
        value: 0.10500000000000001,
    },
];
