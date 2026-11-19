import { proPrice } from "@outlayr/money/pro-prices";

import { COUNTRY_CASTS, USD_RATES } from "./country-casts";
import { GLOBAL } from "./global-brands";
import LOGO_COLORS from "./logos.json";

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

export function demoCast(visitor: string | null): DemoCast {
    const found = visitor === null ? undefined : BY_COUNTRY.get(visitor);
    const country = found ? (visitor ?? "US") : "US";
    const row = found ?? COUNTRY_CASTS.US;
    const pro = proPrice(country, "monthly");
    const fx = usdRate(row.currency);
    return {
        ...row,
        colors: Object.fromEntries(brandsOf(row).map(({ logo }) => [logo, COLORS.get(logo) ?? null])),
        country,
        foreignFx: usdRate(row.accounts.foreign.currency),
        fx,
        ppp: (pro.amount / US_MONTHLY) * (fx / usdRate(pro.currency)),
    };
}
