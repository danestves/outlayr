import { proPrice } from "@outlayr/money/pro-prices";
import type { Locale } from "@outlayr/shared/i18n";

import { COUNTRY_CASTS, USD_RATES, US_HISPANIC } from "./country-casts";
import { GLOBAL } from "./global-brands";
import LOGO_COLORS from "./logos.json";

export const LOCALE_MARKET = {
    de: "DE",
    en: "US",
    es: "MX",
    fr: "FR",
    pt: "BR",
} as const satisfies Record<Locale, keyof typeof COUNTRY_CASTS>;

const HISPANIC_ID = "US_ES";

export type MerchantRole =
    | "grocery"
    | "grocery2"
    | "grocery3"
    | "ride"
    | "ride2"
    | "delivery"
    | "delivery2"
    | "fuel"
    | "online"
    | "store"
    | "fashion"
    | "home"
    | "telco"
    | "utility"
    | "gym"
    | "yearly";

export type Streaming = "netflix" | "spotify";

export interface Brand {
    readonly name: string;
    readonly logo: string;
}

export interface CastRow {
    readonly currency: string;
    readonly merchants: Readonly<{ grocery: Brand } & Partial<Record<MerchantRole, Brand>>>;
    readonly accounts: {
        readonly bank: Brand;
        readonly savings: Brand;
        readonly wallet?: Brand;
        readonly payments?: Brand;
        readonly credit: Brand;
        readonly credit2?: Brand;
        readonly foreign: Brand & { readonly currency: string };
    };
    readonly prices?: Readonly<Partial<Record<Streaming, number>>>;
    readonly absent?: readonly Streaming[];
}

export interface DemoCast extends CastRow {
    readonly country: string;
    readonly id: string;
    readonly colors: Readonly<Record<string, string | null>>;
    readonly ppp: number;
    readonly fx: number;
    readonly foreignFx: number;
}

const BY_COUNTRY = new Map<string, CastRow>(Object.entries(COUNTRY_CASTS));
const RATES = new Map<string, number>(Object.entries(USD_RATES));
const COLORS = new Map<string, string | null>(Object.entries(LOGO_COLORS));
const US_MONTHLY = proPrice(null, "monthly").amount;

function usdRate(currency: string): number {
    const rate = currency === "USD" ? 1 : RATES.get(currency);
    if (rate === undefined) {
        throw new Error(`No USD rate for ${currency}`);
    }
    return rate;
}

const brandsOf = (row: CastRow) => [
    ...Object.values(GLOBAL),
    ...Object.values(row.merchants),
    ...Object.values(row.accounts).filter((brand) => brand !== undefined),
];

export function demoCast(visitor: string | null, locale: Locale): DemoCast {
    const found = visitor === null ? undefined : BY_COUNTRY.get(visitor);
    if (visitor !== null && found) {
        return visitor === "US" && locale === "es"
            ? castFor(visitor, US_HISPANIC, HISPANIC_ID)
            : castFor(visitor, found);
    }
    return marketCast(locale);
}

export function plateCast(locale: Locale): DemoCast {
    return locale === "es" ? castFor("US", US_HISPANIC, HISPANIC_ID) : marketCast(locale);
}

function marketCast(locale: Locale): DemoCast {
    const market = LOCALE_MARKET[locale];
    return castFor(market, COUNTRY_CASTS[market]);
}

function castFor(country: string, row: CastRow, id = country): DemoCast {
    const pro = proPrice(country, "monthly");
    const fx = usdRate(row.currency);
    return {
        ...row,
        colors: Object.fromEntries(brandsOf(row).map(({ logo }) => [logo, COLORS.get(logo) ?? null])),
        country,
        id,
        foreignFx: usdRate(row.accounts.foreign.currency),
        fx,
        ppp: (pro.amount / US_MONTHLY) * (fx / usdRate(pro.currency)),
    };
}
