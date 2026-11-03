import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

const DAY_MS = 24 * 60 * 60 * 1000;

export const RATE_MARKETS = {
    "dolar-bcv-hoy": {
        buy: false,
        currency: "VES",
        key: "fuente",
        kinds: [{ api: "oficial", dateOnly: true, kind: "bcv", source: "https://www.bcv.org.ve/" }],
        maxAgeMs: 7 * DAY_MS,
        numberLocale: "es-VE",
        prices: ["promedio"],
        timeZone: "America/Caracas",
        url: "https://ve.dolarapi.com/v1/dolares",
    },
    "dolar-hoy-argentina": {
        buy: true,
        currency: "ARS",
        key: "casa",
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
        maxAgeMs: 2 * DAY_MS,
        numberLocale: "es-AR",
        prices: ["venta", "promedio"],
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

const Quote = Schema.Struct({
    casa: Schema.optional(Schema.String),
    compra: Schema.optional(Schema.NullOr(Schema.Number)),
    fechaActualizacion: Schema.String,
    fuente: Schema.optional(Schema.String),
    moneda: Schema.Literal("USD"),
    promedio: Schema.optional(Schema.NullOr(Schema.Number)),
    venta: Schema.optional(Schema.NullOr(Schema.Number)),
});
type Quote = typeof Quote.Type;

const isQuote = Schema.is(Quote);

const Quotes = Schema.Array(Schema.Unknown).pipe(
    Schema.decodeTo(Schema.Array(Quote), {
        decode: SchemaGetter.transform((rows) => rows.filter(isQuote)),
        encode: SchemaGetter.transform((quotes) => quotes),
    })
);

export const decodeQuotes = Schema.decodeUnknownSync(Quotes);

const isPositive = (value: number | null | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

export function parseRates(slug: RateSlug, quotes: readonly Quote[], now: number): Rate[] {
    const market = RATE_MARKETS[slug];
    return market.kinds.flatMap(({ api, dateOnly, kind, source }) => {
        const quote = quotes.find((entry) => entry[market.key] === api);
        if (!quote) {
            return [];
        }
        const rate = market.prices.map((field) => quote[field]).find(isPositive);
        const updated = Date.parse(quote.fechaActualizacion);
        if (rate === undefined || Number.isNaN(updated) || now - updated > market.maxAgeMs) {
            return [];
        }
        return [
            {
                buy: market.buy && isPositive(quote.compra) ? quote.compra : null,
                dateOnly,
                kind,
                rate,
                source,
                updatedAt: quote.fechaActualizacion,
            },
        ];
    });
}
