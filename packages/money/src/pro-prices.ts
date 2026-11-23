export type ProPriceRow = readonly [currency: string, monthly: number, yearly: number, once: number];

const US: ProPriceRow = ["USD", 7.99, 49.99, 129.99];

const PRO_PRICES = {
    AE: ["AED", 19.49, 122.99, 319],
    AG: ["USD", 6.69, 41.49, 107.99],
    AL: ["USD", 4.29, 26.49, 68.9],
    AM: ["USD", 4.59, 28.9, 72.9],
    AO: ["USD", 3.39, 20.9, 53.9],
    AR: ["USD", 4.59, 28.9, 74.9],
    AT: ["EUR", 6.49, 40.9, 106.99],
    AU: ["AUD", 9.49, 59.9, 159],
    AZ: ["USD", 4.59, 28.9, 72.9],
    BA: ["EUR", 3.39, 21.49, 55.9],
    BD: ["BDT", 328, 2050, 5340],
    BE: ["EUR", 6.79, 42.49, 109.99],
    BF: ["USD", 3.19, 19.99, 51.99],
    BG: ["EUR", 4.69, 29.49, 76.9],
    BH: ["USD", 4.19, 26, 68],
    BJ: ["USD", 3.19, 19.99, 51.99],
    BM: ["USD", 6.19, 38.9, 100.99],
    BO: ["USD", 3.69, 22.9, 58.9],
    BR: ["BRL", 20.9, 129.9, 339],
    BS: ["USD", 6.19, 38.9, 100.99],
    BW: ["USD", 3.29, 20.9, 53.9],
    BY: ["USD", 4.69, 28.9, 74.9],
    BZ: ["USD", 4.09, 25.49, 66.9],
    CA: ["CAD", 9.19, 57.9, 149],
    CD: ["USD", 3.19, 19.99, 51.99],
    CF: ["EUR", 3.19, 19.79, 51.59],
    CG: ["USD", 3.29, 20.9, 53.9],
    CH: ["CHF", 9.2, 57, 149],
    CI: ["USD", 3.29, 20.49, 52.9],
    CL: ["CLP", 3990, 24_990, 64_990],
    CM: ["USD", 3.19, 19.99, 51.99],
    CO: ["COP", 13_000, 82_500, 214_900],
    CR: ["USD", 5.99, 37.49, 97.9],
    CV: ["USD", 4.09, 25.49, 65.9],
    CY: ["EUR", 5.09, 31.9, 82.9],
    CZ: ["CZK", 135, 849, 2200],
    DE: ["EUR", 6.39, 40.49, 104.99],
    DJ: ["USD", 3.84, 24, 62.4],
    DK: ["DKK", 60, 375, 969],
    DM: ["USD", 4.19, 26.49, 67.9],
    DO: ["USD", 3.99, 24.99, 64.99],
    DZ: ["USD", 3.19, 19.99, 51.99],
    EC: ["USD", 4.09, 25.49, 66.9],
    EE: ["EUR", 5.79, 36.9, 95.9],
    EG: ["EGP", 75.99, 479, 1239.99],
    ES: ["EUR", 5.99, 37.9, 97.9],
    ET: ["ETB", 221, 1380, 3590],
    FI: ["EUR", 6.89, 43.49, 113.99],
    FJ: ["USD", 3.29, 20.49, 52.9],
    FM: ["USD", 7.99, 49.99, 129.99],
    FR: ["EUR", 6.39, 40.49, 104.99],
    GA: ["USD", 3.69, 22.95, 59.9],
    GB: ["GBP", 5.79, 35.99, 93.9],
    GD: ["USD", 4.29, 26.9, 69.9],
    GE: ["USD", 5.39, 33.95, 85.9],
    GH: ["USD", 3.39, 21.49, 54.99],
    GM: ["USD", 3.19, 19.99, 51.99],
    GN: ["USD", 1.58, 9.9, 25.74],
    GR: ["EUR", 5.79, 36.49, 93.9],
    GT: ["USD", 4.09, 25.9, 66.9],
    GW: ["USD", 3.19, 19.99, 51.99],
    HK: ["HKD", 43, 268, 698],
    HN: ["USD", 4.39, 26.99, 70.9],
    HR: ["EUR", 4.79, 29.99, 77.99],
    HT: ["USD", 1.26, 7.9, 20.54],
    HU: ["HUF", 1790, 11_190, 29_000],
    ID: ["IDR", 48_000, 300_000, 780_000],
    IE: ["EUR", 7.59, 47.49, 122.99],
    IL: ["ILS", 25.5, 159, 414.9],
    IN: ["INR", 199, 1249, 3249],
    IQ: ["USD", 3.19, 19.99, 51.99],
    IS: ["USD", 9.29, 57.9, 149.99],
    IT: ["EUR", 6.19, 38.49, 100],
    JM: ["USD", 4.29, 26.9, 69.9],
    JO: ["USD", 3.69, 23.49, 60.9],
    JP: ["JPY", 820, 5080, 13_200],
    KE: ["USD", 2.69, 16.9, 42.99],
    KG: ["USD", 4.59, 28.9, 72.9],
    KH: ["USD", 3.19, 19.99, 51.99],
    KM: ["USD", 4.25, 26.59, 69.15],
    KN: ["USD", 6.19, 38.9, 100.99],
    KR: ["KRW", 5800, 35_900, 93_500],
    KW: ["USD", 4.79, 29.99, 77.99],
    KY: ["USD", 6.19, 38.9, 100.99],
    KZ: ["KZT", 2200, 13_900, 32_900],
    LA: ["USD", 4.29, 26.9, 69.9],
    LB: ["USD", 4.59, 28.9, 74.9],
    LC: ["USD", 3.9, 24.49, 63.9],
    LK: ["USD", 3.19, 19.99, 51.99],
    LR: ["USD", 3.19, 19.99, 51.99],
    LT: ["EUR", 5.39, 33.9, 87.9],
    LU: ["EUR", 6.99, 44.49, 115.99],
    LV: ["EUR", 5.39, 33.9, 87.9],
    LY: ["USD", 3.19, 19.99, 51.99],
    MA: ["USD", 3.29, 20.49, 52.99],
    MD: ["USD", 4.59, 28.9, 72.9],
    MK: ["USD", 3.69, 23, 58],
    ML: ["USD", 3.19, 19.99, 51.99],
    MM: ["USD", 3.19, 19.99, 51.99],
    MN: ["USD", 3.19, 19.99, 51.99],
    MO: ["USD", 5.09, 31.49, 81.9],
    MT: ["EUR", 5.99, 37.9, 97.9],
    MU: ["USD", 3.59, 22.49, 58.9],
    MV: ["USD", 5.59, 34.99, 90.99],
    MX: ["MXN", 108, 670, 1749],
    MY: ["MYR", 22.5, 139.9, 364.9],
    MZ: ["USD", 3.19, 19.99, 51.99],
    NA: ["USD", 3.39, 21.49, 54.99],
    NE: ["USD", 3.19, 19.99, 51.99],
    NG: ["NGN", 2600, 16_300, 42_500],
    NI: ["USD", 3.49, 21.9, 56.9],
    NL: ["EUR", 6.59, 41.49, 107.99],
    NO: ["NOK", 70, 439, 1130],
    NP: ["USD", 3.19, 19.99, 51.99],
    NZ: ["NZD", 11.49, 70.9, 184.99],
    OM: ["USD", 4.19, 26, 68],
    PA: ["USD", 4.39, 27.49, 70.9],
    PE: ["PEN", 17.99, 111.9, 289.9],
    PG: ["USD", 4.69, 29.49, 75.99],
    PH: ["PHP", 179, 1120, 2900],
    PK: ["PKR", 520, 3249, 8400],
    PL: ["PLN", 21.99, 137.99, 359],
    PT: ["EUR", 5.19, 32.49, 84.9],
    PY: ["USD", 3.29, 20.49, 52.9],
    QA: ["QAR", 17.49, 109, 284.99],
    RO: ["RON", 23.49, 146.99, 379.99],
    RS: ["EUR", 3.69, 22.9, 59.9],
    RU: ["RUB", 699, 4490, 9990],
    RW: ["USD", 3.19, 19.99, 51.99],
    SA: ["SAR", 19.49, 122.99, 319],
    SB: ["USD", 3.19, 19.99, 51.99],
    SC: ["USD", 4.29, 26.49, 68.9],
    SE: ["SEK", 70, 435, 1120],
    SG: ["SGD", 9.18, 57.9, 149],
    SI: ["EUR", 5.29, 33.49, 86.9],
    SK: ["EUR", 5.59, 35.49, 91.9],
    SL: ["USD", 3.19, 19.99, 51.99],
    SM: ["EUR", 6.09, 37.99, 98.89],
    SN: ["USD", 3.19, 19.99, 51.99],
    SO: ["USD", 1.2, 7.5, 19.5],
    SR: ["USD", 3.19, 19.49, 50.9],
    SV: ["USD", 4.19, 26.49, 67.9],
    TD: ["USD", 3.29, 20.49, 52.9],
    TG: ["EUR", 2.79, 17.69, 45.99],
    TH: ["THB", 139, 870, 2250],
    TJ: ["USD", 5.39, 33.95, 85.9],
    TM: ["USD", 4.59, 28.9, 72.9],
    TN: ["USD", 3.19, 19.99, 51.99],
    TO: ["USD", 5.19, 32.49, 83.99],
    TR: ["TRY", 179, 1129.99, 2949.99],
    TT: ["USD", 6.79, 42.49, 109.99],
    TW: ["TWD", 150, 950, 2480],
    TZ: ["TZS", 8400, 52_900, 136_900],
    UA: ["USD", 3.49, 21.49, 54.9],
    UG: ["USD", 3.19, 19.99, 51.99],
    UY: ["USD", 6.79, 42.49, 109.99],
    UZ: ["USD", 4.59, 28.9, 72.9],
    VE: ["USD", 3.9, 24.49, 63.9],
    VG: ["USD", 6.19, 38.9, 100.99],
    VN: ["VND", 92_000, 579_000, 1_500_000],
    VU: ["USD", 3.19, 19.99, 51.99],
    WS: ["USD", 4.69, 29.34, 76.3],
    ZA: ["ZAR", 71.99, 449, 1159.99],
    ZM: ["USD", 3.19, 19.99, 51.99],
    ZW: ["USD", 3.19, 19.99, 51.99],
} satisfies Record<string, ProPriceRow>;

export type PriceCountry = keyof typeof PRO_PRICES | "US";

const BY_COUNTRY = new Map<string, ProPriceRow>(Object.entries(PRO_PRICES));

export const PRO_PLANS = ["monthly", "annual", "lifetime"] as const;
export type ProPlan = (typeof PRO_PLANS)[number];

export interface ProPrice {
    readonly amount: number;
    readonly currency: string;
    readonly plan: ProPlan;
}

export const localProPriceRow = (country: string | null) =>
    country === null || country === "US" ? undefined : BY_COUNTRY.get(country);

const rowPrice = ([currency, monthly, annual, lifetime]: ProPriceRow, plan: ProPlan): ProPrice => ({
    amount: { annual, lifetime, monthly }[plan],
    currency,
    plan,
});

export const proPrice = (country: string | null, plan: ProPlan) => rowPrice(localProPriceRow(country) ?? US, plan);
const STRIPE_ZERO_DECIMAL = new Set(["CLP", "JPY", "KRW", "PYG", "VND", "XAF", "XOF"]);
const STRIPE_THREE_DECIMAL = new Set(["JOD"]);

export function stripeMinorUnits({ amount, currency }: Pick<ProPrice, "amount" | "currency">) {
    if (STRIPE_ZERO_DECIMAL.has(currency)) {
        return Math.round(amount);
    }
    return Math.round(amount * (STRIPE_THREE_DECIMAL.has(currency) ? 1000 : 100));
}

export function stripeMajorUnits(minor: number, currency: string) {
    if (STRIPE_ZERO_DECIMAL.has(currency)) {
        return minor;
    }
    return minor / (STRIPE_THREE_DECIMAL.has(currency) ? 1000 : 100);
}

export const proPriceKey = (price: ProPrice) =>
    `pro_${price.plan}_${price.currency.toLowerCase()}_${stripeMinorUnits(price)}`;

export function allProPrices() {
    const rows = [US, ...BY_COUNTRY.values()];
    const prices = rows.flatMap((row) => PRO_PLANS.map((plan) => rowPrice(row, plan)));
    return [...new Map(prices.map((price) => [proPriceKey(price), price])).values()];
}
