import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { MarketRateType } from "./lib/currencies";

const COTIZAVE_URL = "https://api.cotizave.com/v1/fx/rates";
const RATES_TIMEOUT_MS = 20_000;

const VES_QUOTE = "VES";

/** `reference` is the BCV official rate. */
// A Map: `.get` on an untrusted market name answers undefined without widening the key type.
const MARKET_RATE_TYPES = new Map<string, MarketRateType>([
    ["binance", "binance"],
    ["eur_reference", "eur_reference"],
    ["reference", "official"],
]);

const CotizaveMarket = Schema.Struct({
    market: Schema.String,
    mid: Schema.Finite.check(Schema.isGreaterThan(0)),
});

/** Pinned to the pair we store; an unparseable market entry is dropped, not the whole feed. */
const CotizaveResponse = Schema.Struct({
    base: Schema.Literal("USD"),
    currency: Schema.Literal(VES_QUOTE),
    rates: Schema.Array(
        Schema.NullOr(CotizaveMarket).pipe(Schema.catchDecoding(() => Effect.succeed(Option.some(null))))
    ),
});

export function requestRates(apiKey: string): Promise<Response> {
    return fetch(COTIZAVE_URL, {
        headers: { "X-API-Key": apiKey },
        signal: AbortSignal.timeout(RATES_TIMEOUT_MS),
    });
}

export const decodeCotizaveResponse = Schema.decodeUnknownOption(CotizaveResponse);

interface CotizaveRate {
    quote: string;
    rate: number;
    rateType: MarketRateType;
}

export function extractRates(payload: typeof CotizaveResponse.Type): CotizaveRate[] {
    const parsed: CotizaveRate[] = [];
    for (const record of payload.rates) {
        const rateType = record === null ? undefined : MARKET_RATE_TYPES.get(record.market);
        if (record === null || rateType === undefined) {
            continue;
        }
        parsed.push({ quote: VES_QUOTE, rate: record.mid, rateType });
    }
    return parsed;
}
