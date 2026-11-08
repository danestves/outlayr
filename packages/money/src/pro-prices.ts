export type ProPriceRow = readonly [currency: string, monthly: number, yearly: number, once: number];

const US: ProPriceRow = ["USD", 7.99, 49.99, 129.99];

const PRO_PRICES = {
    AE: ["AED", 17.99, 113, 294],
    AG: ["USD", 6.62, 41.39, 107.63],
    AL: ["USD", 4.23, 26.49, 68.89],
    AM: ["USD", 3.8, 23.8, 61.88],
    AO: ["USD", 3.31, 20.7, 53.82],
    AR: ["ARS", 7230, 45_300, 118_000],
    AT: ["EUR", 6.49, 40.89, 106],
    AU: ["AUD", 9.49, 59.69, 155],
    AZ: ["AZN", 5.49, 34.29, 89.09],
    BA: ["USD", 3.72, 23.3, 60.58],
    BD: ["BDT", 328, 2050, 5340],
    BE: ["EUR", 6.69, 41.89, 109],
    BF: ["EUR", 2.59, 16.29, 42.39],
    BG: ["EUR", 4.69, 29.49, 76.59],
    BH: ["USD", 4.07, 25.49, 66.29],
    BJ: ["EUR", 2.59, 16.49, 42.89],
    BM: ["USD", 5.35, 33.49, 87.09],
    BO: ["BOB", 42.09, 264, 686],
    BR: ["BRL", 16.89, 106, 275],
    BS: ["USD", 5.35, 33.49, 87.09],
    BW: ["USD", 3.28, 20.5, 53.3],
    BY: ["USD", 4.6, 28.79, 74.87],
    BZ: ["USD", 4.07, 25.49, 66.29],
    CA: ["CAD", 9.19, 57.29, 149],
    CD: ["USD", 1.2, 7.5, 19.5],
    CF: ["EUR", 3.19, 19.79, 51.59],
    CG: ["USD", 3.29, 20.6, 53.56],
    CH: ["CHF", 7.89, 49.49, 129],
    CI: ["XOF", 1910, 12_000, 31_100],
    CL: ["CLP", 3760, 23_500, 61_200],
    CM: ["XAF", 1800, 11_300, 29_400],
    CO: ["COP", 9650, 60_400, 157_000],
    CR: ["CRC", 2290, 14_300, 37_200],
    CV: ["USD", 4.05, 25.34, 65.9],
    CY: ["EUR", 5.09, 31.69, 82.49],
    CZ: ["CZK", 116, 727, 1890],
    DE: ["EUR", 6.39, 40.19, 104],
    DJ: ["USD", 3.84, 24, 62.4],
    DK: ["DKK", 57.79, 362, 941],
    DM: ["USD", 4.17, 26.09, 67.85],
    DO: ["USD", 3.92, 24.55, 63.83],
    DZ: ["DZD", 383, 2400, 6230],
    EC: ["USD", 4.06, 25.39, 66.03],
    EE: ["EUR", 5.79, 36.59, 95.09],
    EG: ["EGP", 69.49, 436, 1130],
    ES: ["EUR", 5.99, 37.59, 97.69],
    ET: ["ETB", 221, 1380, 3590],
    FI: ["EUR", 6.89, 43.49, 113],
    FJ: ["USD", 3.24, 20.25, 52.65],
    FM: ["USD", 1.65, 10.3, 26.78],
    FR: ["EUR", 6.39, 40.19, 104],
    GA: ["EUR", 3.29, 20.89, 54.39],
    GB: ["GBP", 5.79, 35.99, 93.69],
    GD: ["USD", 4.28, 26.79, 69.67],
    GE: ["GEL", 10.19, 63.79, 166],
    GH: ["GHS", 39.79, 249, 648],
    GM: ["USD", 1.37, 8.6, 22.36],
    GN: ["USD", 1.58, 9.9, 25.74],
    GR: ["EUR", 5.79, 36.09, 93.79],
    GT: ["USD", 4.08, 25.54, 66.42],
    GW: ["EUR", 2.89, 18.09, 46.99],
    HK: ["HKD", 42.59, 266, 693],
    HN: ["USD", 4.31, 26.99, 70.19],
    HR: ["EUR", 4.29, 26.99, 70.29],
    HT: ["USD", 1.26, 7.9, 20.54],
    HU: ["HUF", 1310, 8180, 21_300],
    ID: ["IDR", 45_600, 285_000, 741_000],
    IE: ["EUR", 7.29, 45.79, 119],
    IL: ["ILS", 25.39, 159, 413],
    IN: ["INR", 187, 1170, 3050],
    IQ: ["IQD", 4430, 27_700, 71_900],
    IS: ["EUR", 8.39, 52.39, 136],
    IT: ["EUR", 6.19, 38.49, 100],
    JM: ["USD", 4.28, 26.79, 69.67],
    JO: ["JOD", 2.59, 16.59, 42.99],
    JP: ["JPY", 811, 5080, 13_200],
    KE: ["KES", 343, 2150, 5580],
    KG: ["USD", 2.28, 14.25, 37.05],
    KH: ["USD", 3.12, 19.55, 50.83],
    KM: ["USD", 4.25, 26.59, 69.15],
    KN: ["USD", 4.87, 30.49, 79.29],
    KR: ["KRW", 5750, 35_900, 93_500],
    KW: ["USD", 4.55, 28.44, 73.96],
    KY: ["USD", 5.35, 33.49, 87.09],
    KZ: ["KZT", 1610, 10_100, 26_200],
    LA: ["USD", 4.29, 26.84, 69.8],
    LB: ["USD", 4.59, 28.69, 74.61],
    LC: ["USD", 3.9, 24.4, 63.44],
    LK: ["LKR", 1060, 6610, 17_200],
    LR: ["USD", 1.2, 7.5, 19.5],
    LT: ["EUR", 5.39, 33.69, 87.79],
    LU: ["EUR", 6.99, 44.09, 115],
    LV: ["EUR", 5.39, 33.79, 87.89],
    LY: ["USD", 2.96, 18.5, 48.1],
    MA: ["MAD", 32.19, 202, 525],
    MD: ["USD", 4.37, 27.34, 71.1],
    MK: ["USD", 3.53, 22.1, 57.46],
    ML: ["EUR", 2.59, 16.29, 42.39],
    MM: ["MMK", 3750, 23_500, 61_100],
    MN: ["MNT", 10_500, 66_000, 172_000],
    MO: ["MOP", 40.59, 254, 660],
    MT: ["EUR", 5.99, 37.59, 97.89],
    MU: ["USD", 3.51, 21.95, 57.07],
    MV: ["USD", 5.35, 33.44, 86.96],
    MX: ["MXN", 93.69, 586, 1520],
    MY: ["MYR", 10.49, 65.59, 170],
    MZ: ["USD", 1.2, 7.5, 19.5],
    NA: ["USD", 3.38, 21.15, 54.99],
    NE: ["EUR", 2.69, 16.69, 43.39],
    NG: ["NGN", 2270, 14_200, 36_900],
    NI: ["USD", 3.49, 21.85, 56.81],
    NL: ["EUR", 6.59, 41.19, 107],
    NO: ["NOK", 69.69, 436, 1130],
    NP: ["USD", 2.44, 15.3, 39.78],
    NZ: ["NZD", 11.19, 70.09, 182],
    OM: ["USD", 4.03, 25.19, 65.51],
    PA: ["USD", 4.35, 27.19, 70.71],
    PE: ["PEN", 16.09, 101, 262],
    PG: ["USD", 4.67, 29.19, 75.91],
    PH: ["PHP", 147, 922, 2400],
    PK: ["PKR", 516, 3230, 8400],
    PL: ["PLN", 16.09, 101, 261],
    PT: ["EUR", 4.99, 31.09, 80.79],
    PY: ["PYG", 20_500, 128_000, 333_000],
    QA: ["QAR", 14.99, 93.89, 244],
    RO: ["RON", 20.69, 129, 336],
    RS: ["RSD", 428, 2680, 6970],
    RU: ["RUB", 465, 2910, 7570],
    RW: ["USD", 2.49, 15.6, 40.56],
    SA: ["SAR", 16.09, 101, 262],
    SB: ["USD", 1.2, 7.5, 19.5],
    SC: ["USD", 4.21, 26.34, 68.5],
    SE: ["SEK", 69.09, 432, 1120],
    SG: ["SGD", 7.69, 47.89, 125],
    SI: ["EUR", 5.29, 33.29, 86.49],
    SK: ["EUR", 5.59, 35.09, 91.19],
    SL: ["USD", 1.38, 8.65, 22.49],
    SM: ["EUR", 6.09, 37.99, 98.89],
    SN: ["XOF", 1900, 11_900, 31_000],
    SO: ["USD", 1.2, 7.5, 19.5],
    SR: ["USD", 3.1, 19.4, 50.44],
    SV: ["USD", 4.16, 26.04, 67.72],
    TD: ["USD", 3.21, 20.1, 52.26],
    TG: ["EUR", 2.79, 17.69, 45.99],
    TH: ["THB", 86.49, 540, 1410],
    TJ: ["USD", 2.15, 13.45, 34.97],
    TM: ["USD", 3.77, 23.6, 61.36],
    TN: ["USD", 2.98, 18.65, 48.49],
    TO: ["USD", 5.16, 32.29, 83.97],
    TR: ["TRY", 179, 1120, 2910],
    TT: ["USD", 5.01, 31.34, 81.5],
    TW: ["TWD", 137, 858, 2230],
    TZ: ["TZS", 4010, 25_100, 65_200],
    UA: ["UAH", 123, 768, 2000],
    UG: ["USD", 3.15, 19.7, 51.22],
    UY: ["USD", 5.41, 33.84, 88],
    UZ: ["UZS", 27_100, 169_000, 440_000],
    VE: ["USD", 3.9, 24.4, 63.44],
    VG: ["USD", 5.35, 33.49, 87.09],
    VN: ["VND", 84_400, 528_000, 1_370_000],
    VU: ["USD", 1.63, 10.2, 26.52],
    WS: ["USD", 4.69, 29.34, 76.3],
    ZA: ["ZAR", 61.99, 388, 1010],
    ZM: ["USD", 2.92, 18.3, 47.58],
    ZW: ["USD", 1.87, 11.7, 30.42],
} satisfies Record<string, ProPriceRow>;

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
