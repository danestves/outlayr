import * as Schema from "effect/Schema";

export const RATE_MARKETS = {
    "dolar-bcv-hoy": {
        currency: "VES",
        kinds: [{ api: "oficial", dateOnly: true, kind: "bcv", source: "https://www.bcv.org.ve/" }],
        numberLocale: "es-VE",
        timeZone: "America/Caracas",
        url: "https://ve.dolarapi.com/v1/dolares",
    },
    "dolar-hoy-argentina": {
        currency: "ARS",
        kinds: [
            { api: "blue", dateOnly: false, kind: "blue", source: "https://dolarhoy.com/" },
            {
                api: "oficial",
                dateOnly: false,
                kind: "oficial",
                source: "https://www.ambito.com/contenidos/dolar.html",
            },
            { api: "bolsa", dateOnly: false, kind: "mep", source: "https://dolarhoy.com/" },
            { api: "contadoconliqui", dateOnly: false, kind: "ccl", source: "https://dolarhoy.com/" },
            {
                api: "tarjeta",
                dateOnly: false,
                kind: "tarjeta",
                source: "https://www.ambito.com/contenidos/dolar.html",
            },
            {
                api: "mayorista",
                dateOnly: false,
                kind: "mayorista",
                source: "https://www.ambito.com/contenidos/dolar.html",
            },
            { api: "cripto", dateOnly: false, kind: "cripto", source: "https://dolarhoy.com/" },
        ],
        numberLocale: "es-AR",
        timeZone: "America/Argentina/Buenos_Aires",
        url: "https://dolarapi.com/v1/dolares",
    },
} as const;

export type RateSlug = keyof typeof RATE_MARKETS;
export type RateKind = (typeof RATE_MARKETS)[RateSlug]["kinds"][number]["kind"];

export interface Rate {
    buy: number | null;
    dateOnly: boolean;
    kind: RateKind;
    rate: number;
    source: string;
    updatedAt: string;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const Quote = Schema.Struct({
    casa: Schema.optional(Schema.String),
    compra: Schema.optional(Schema.NullOr(Schema.Number)),
    fechaActualizacion: Schema.String,
    fuente: Schema.optional(Schema.String),
    promedio: Schema.optional(Schema.NullOr(Schema.Number)),
    venta: Schema.optional(Schema.NullOr(Schema.Number)),
});
export const decodeQuotes = Schema.decodeUnknownSync(Schema.Array(Quote));

type Quotes = ReturnType<typeof decodeQuotes>;

const isPositive = (value: number | null | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

export function parseRates(slug: RateSlug, quotes: Quotes, now: number): Rate[] {
    return RATE_MARKETS[slug].kinds.flatMap(({ api, dateOnly, kind, source }) => {
        const quote = quotes.find((entry) => (entry.casa ?? entry.fuente) === api);
        if (!quote) {
            return [];
        }
        const rate = [quote.venta, quote.promedio].find(isPositive);
        const updated = Date.parse(quote.fechaActualizacion);
        if (rate === undefined || Number.isNaN(updated) || now - updated > MAX_AGE_MS) {
            return [];
        }
        return [
            {
                buy: isPositive(quote.compra) ? quote.compra : null,
                dateOnly,
                kind,
                rate,
                source,
                updatedAt: quote.fechaActualizacion,
            },
        ];
    });
}
