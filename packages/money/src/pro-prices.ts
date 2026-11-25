export type ProPriceRow = readonly [currency: string, monthly: number, yearly: number, once: number];

const US: ProPriceRow = ["USD", 9.99, 59.99, 199.99];

const PRO_PRICES = {
    AE: ["AED", 22.99, 139.99, 449.99],
    AG: ["USD", 7.99, 49.99, 169.99],
    AL: ["USD", 4.99, 29.99, 109.99],
    AM: ["USD", 4.99, 29.99, 94.99],
    AO: ["USD", 3.99, 24.99, 84.99],
    AR: ["USD", 5.99, 34.99, 119.99],
    AT: ["EUR", 7.99, 49.99, 169.99],
    AU: ["AUD", 12.99, 74.99, 249.99],
    AZ: ["USD", 4.59, 28.9, 79.99],
    BA: ["EUR", 3.99, 24.99, 84.99],
    BD: ["BDT", 409.99, 2490, 8290],
    BE: ["EUR", 8.99, 49.99, 169.99],
    BF: ["USD", 3.99, 19.99, 74.99],
    BG: ["EUR", 5.99, 34.99, 119.99],
    BH: ["USD", 4.99, 29.99, 99.99],
    BJ: ["USD", 3.99, 19.99, 74.99],
    BM: ["USD", 6.99, 39.99, 129.99],
    BO: ["USD", 4.49, 24.99, 89.99],
    BR: ["BRL", 24.99, 149, 479],
    BS: ["USD", 6.99, 39.99, 129.99],
    BW: ["USD", 3.99, 24.99, 79.99],
    BY: ["USD", 5.99, 34.99, 119.99],
    BZ: ["USD", 4.99, 29.99, 99.99],
    CA: ["CAD", 11.99, 69.99, 229.99],
    CD: ["USD", 3.19, 19.99, 51.99],
    CF: ["EUR", 3.99, 24.99, 79.99],
    CG: ["USD", 3.99, 24.99, 79.99],
    CH: ["CHF", 10, 59, 199],
    CI: ["USD", 3.99, 24.99, 79.99],
    CL: ["CLP", 4890, 29_000, 97_990],
    CM: ["USD", 3.99, 24.99, 74.99],
    CO: ["COP", 13_900, 82_900, 279_000],
    CR: ["USD", 5.99, 39.99, 129.99],
    CV: ["USD", 4.99, 29.99, 99.99],
    CY: ["EUR", 6.99, 39.99, 129.99],
    CZ: ["CZK", 149.99, 899.99, 2990],
    DE: ["EUR", 7.99, 49.99, 159.99],
    DJ: ["USD", 4.99, 29.99, 94.99],
    DK: ["DKK", 79, 449, 1490],
    DM: ["USD", 4.99, 29.99, 99.99],
    DO: ["USD", 4.99, 29.99, 99.99],
    DZ: ["USD", 3.49, 19.99, 69.99],
    EC: ["USD", 4.99, 29.99, 99.99],
    EE: ["EUR", 6.99, 44.99, 149.99],
    EG: ["EGP", 84.99, 509.99, 1699.99],
    ES: ["EUR", 7.99, 44.99, 149.99],
    ET: ["ETB", 279.99, 1690, 5590],
    FI: ["EUR", 8.99, 54.99, 179.99],
    FJ: ["USD", 3.99, 24.99, 79.99],
    FM: ["USD", 7.99, 49.99, 129.99],
    FR: ["EUR", 7.99, 49.99, 159.99],
    GA: ["USD", 4.99, 29.99, 94.99],
    GB: ["GBP", 6.99, 44.99, 149.99],
    GD: ["USD", 4.99, 29.99, 109.99],
    GE: ["USD", 5.39, 33.95, 99.99],
    GH: ["USD", 3.99, 24.99, 84.99],
    GM: ["USD", 3.19, 19.99, 51.99],
    GN: ["USD", 1.99, 11.99, 39.99],
    GR: ["EUR", 6.99, 44.99, 149.99],
    GT: ["USD", 4.99, 29.99, 99.99],
    GW: ["USD", 3.99, 24.99, 79.99],
    HK: ["HKD", 49, 319, 1080],
    HN: ["USD", 4.99, 29.99, 109.99],
    HR: ["EUR", 5.99, 34.99, 109.99],
    HT: ["USD", 1.49, 8.99, 29.99],
    HU: ["HUF", 1790, 11_190, 33_900],
    ID: ["IDR", 59_000, 349_000, 1_199_000],
    IE: ["EUR", 8.99, 54.99, 189.99],
    IL: ["ILS", 34, 209, 689],
    IN: ["INR", 229, 1399, 4599],
    IQ: ["USD", 3.99, 19.99, 74.99],
    IS: ["USD", 11.99, 69.99, 239.99],
    IT: ["EUR", 7.99, 44.99, 159.99],
    JM: ["USD", 4.99, 29.99, 109.99],
    JO: ["USD", 4.99, 29.99, 94.99],
    JP: ["JPY", 990, 6190, 19_900],
    KE: ["USD", 2.99, 19.99, 64.99],
    KG: ["USD", 4.59, 28.9, 72.9],
    KH: ["USD", 3.99, 24.99, 79.99],
    KM: ["USD", 4.99, 29.99, 109.99],
    KN: ["USD", 6.19, 38.9, 119.99],
    KR: ["KRW", 6900, 43_900, 149_000],
    KW: ["USD", 5.99, 34.99, 109.99],
    KY: ["USD", 6.99, 39.99, 129.99],
    KZ: ["KZT", 2200, 13_900, 40_990],
    LA: ["USD", 4.99, 29.99, 109.99],
    LB: ["USD", 5.99, 34.99, 109.99],
    LC: ["USD", 4.99, 29.99, 99.99],
    LK: ["USD", 3.99, 24.99, 79.99],
    LR: ["USD", 3.19, 19.99, 51.99],
    LT: ["EUR", 6.99, 39.99, 139.99],
    LU: ["EUR", 8.99, 54.99, 179.99],
    LV: ["EUR", 6.99, 39.99, 139.99],
    LY: ["USD", 3.99, 19.99, 74.99],
    MA: ["USD", 3.99, 24.99, 79.99],
    MD: ["USD", 4.99, 34.99, 109.99],
    MK: ["USD", 3.99, 24.99, 89.99],
    ML: ["USD", 3.99, 19.99, 74.99],
    MM: ["USD", 3.19, 19.99, 51.99],
    MN: ["USD", 3.99, 19.99, 74.99],
    MO: ["USD", 5.99, 39.99, 129.99],
    MT: ["EUR", 7.99, 44.99, 149.99],
    MU: ["USD", 3.99, 24.99, 89.99],
    MV: ["USD", 6.99, 39.99, 129.99],
    MX: ["MXN", 119, 729, 2399],
    MY: ["MYR", 22.5, 139.9, 364.9],
    MZ: ["USD", 3.19, 19.99, 51.99],
    NA: ["USD", 3.99, 24.99, 84.99],
    NE: ["USD", 3.99, 21.99, 74.99],
    NG: ["NGN", 2900, 16_900, 57_900],
    NI: ["USD", 3.99, 24.99, 84.99],
    NL: ["EUR", 7.99, 49.99, 169.99],
    NO: ["NOK", 89, 549, 1799],
    NP: ["USD", 3.19, 19.99, 59.99],
    NZ: ["NZD", 14.99, 89.99, 289.99],
    OM: ["USD", 4.99, 29.99, 99.99],
    PA: ["USD", 4.99, 34.99, 109.99],
    PE: ["PEN", 19.99, 119, 409],
    PG: ["USD", 5.99, 34.99, 119.99],
    PH: ["PHP", 189, 1120, 3690],
    PK: ["PKR", 649, 3899, 12_900],
    PL: ["PLN", 21.99, 137.99, 419.99],
    PT: ["EUR", 5.99, 39.99, 129.99],
    PY: ["USD", 3.99, 24.99, 89.99],
    QA: ["QAR", 19.99, 109.99, 379.99],
    RO: ["RON", 24.99, 159.99, 529.99],
    RS: ["EUR", 4.99, 29.99, 94.99],
    RU: ["RUB", 699, 4490, 11_900],
    RW: ["USD", 3.19, 19.99, 59.99],
    SA: ["SAR", 19.99, 122.99, 399.99],
    SB: ["USD", 3.19, 19.99, 51.99],
    SC: ["USD", 4.99, 29.99, 109.99],
    SE: ["SEK", 89, 539, 1790],
    SG: ["SGD", 9.99, 59.99, 189],
    SI: ["EUR", 6.99, 39.99, 139.99],
    SK: ["EUR", 6.99, 44.99, 139.99],
    SL: ["USD", 3.19, 19.99, 51.99],
    SM: ["EUR", 7.99, 44.99, 159.99],
    SN: ["USD", 3.99, 24.99, 79.99],
    SO: ["USD", 1.49, 8.99, 29.99],
    SR: ["USD", 3.99, 24.99, 79.99],
    SV: ["USD", 4.99, 29.99, 99.99],
    TD: ["USD", 3.99, 24.99, 79.99],
    TG: ["EUR", 3.49, 19.99, 74.99],
    TH: ["THB", 139, 870, 2250],
    TJ: ["USD", 5.39, 33.95, 85.9],
    TM: ["USD", 4.99, 29.99, 94.99],
    TN: ["USD", 3.99, 21.99, 74.99],
    TO: ["USD", 5.99, 39.99, 129.99],
    TR: ["TRY", 229.99, 1389.99, 4599],
    TT: ["USD", 6.79, 42.49, 129.99],
    TW: ["TWD", 168, 1080, 3480],
    TZ: ["TZS", 8400, 52_900, 136_900],
    UA: ["USD", 3.49, 21.49, 69.99],
    UG: ["USD", 3.99, 24.99, 79.99],
    UY: ["USD", 6.99, 42.49, 139.99],
    UZ: ["USD", 4.59, 28.9, 72.9],
    VE: ["USD", 4.99, 29.99, 99.99],
    VG: ["USD", 6.99, 39.99, 129.99],
    VN: ["VND", 109_000, 629_000, 2_099_000],
    VU: ["USD", 3.19, 19.99, 51.99],
    WS: ["USD", 5.99, 34.99, 119.99],
    ZA: ["ZAR", 79.99, 489.99, 1599.99],
    ZM: ["USD", 3.99, 19.99, 74.99],
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
